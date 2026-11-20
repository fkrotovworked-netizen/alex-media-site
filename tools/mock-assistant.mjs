// node tools/mock-assistant.mjs — runs the real worker (worker/index.js) locally on :8787 against a fake
// OpenAI-compatible model on :8788, with Telegram and email intercepted and printed instead of sent.
// Open the site with ?alex=http://localhost:8787/chat (development only) to talk to it.
//
// The fake model: a message with a phone or @nick → it calls leave_lead; after the tool → it confirms;
// «медленно» → answers after 4 s; otherwise a short canned answer that proves it got the site's knowledge.
import http from 'node:http';
import worker from '../worker/index.js';

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.startsWith('https://api.telegram.org') || u.startsWith('https://api.resend.com')) {
    console.log(`[intercepted] ${u.split('/')[2]}: ${JSON.parse(init.body).text ?? JSON.parse(init.body).subject}`);
    return new Response('{}', { status: 200 });
  }
  return realFetch(url, init);
};

const env = {
  ALLOWED_ORIGINS: 'http://localhost:5183,http://localhost:5184',
  AI_KEY: 'test',
  AI_BASE_URL: 'http://localhost:8788',
  AI_MODEL: 'mock',
  TG_TOKEN: 'test',
  TG_CHAT_ID: '1',
  RESEND_KEY: 'test',
  LEAD_EMAIL: 'test@example.com'
};

const read = (req) => new Promise((ok) => {
  let b = '';
  req.on('data', (c) => (b += c));
  req.on('end', () => ok(b));
});

// the worker, served by node
http
  .createServer(async (req, res) => {
    const body = req.method === 'POST' ? await read(req) : undefined;
    const request = new Request(`http://localhost:8787${req.url}`, { method: req.method, headers: req.headers, body });
    const response = await worker.fetch(request, env);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  })
  .listen(8787, () => console.log('worker on http://localhost:8787 (POST /chat, POST /)'));

// the fake model
http
  .createServer(async (req, res) => {
    const { messages } = JSON.parse(await read(req));
    const last = messages.at(-1);
    const system = messages[0].content;
    const reply = (message) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message }] }));
    };
    if (last.role === 'tool') return reply({ role: 'assistant', content: 'Готово, передал заявку Александру. Он или менеджер напишет вам в рабочее время.' });
    const text = last.content;
    const contact = text.match(/(\+?\d[\d\s()-]{8,}\d|@[A-Za-z0-9_]{4,})/);
    if (contact)
      return reply({
        role: 'assistant',
        content: null,
        tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'leave_lead', arguments: JSON.stringify({ contact: contact[0], service: 'Лидогенерация', task: 'Хочет заявки из рекламы' }) } }]
      });
    if (/медленно/i.test(text)) await new Promise((r) => setTimeout(r, 4000));
    const price = system.match(/Лидогенерация под ключ: от [^.]+/)?.[0] ?? 'нет сведений';
    const kase = system.match(/- Ёбидоёби[^\n]*/)?.[0]?.slice(2, 160) ?? '';
    reply({
      role: 'assistant',
      content: `Тестовый ответ (заглушка модели). Вижу сведения сайта: ${price}. Пример кейса: ${kase}\nОставьте телефон или ник в Telegram — передам заявку.`
    });
  })
  .listen(8788, () => console.log('fake model on http://localhost:8788'));
