// Алекс — the site's assistant. POST /chat with { messages: [{ role: 'user' | 'assistant', content }], page, website }.
// Answers { reply, lead?: 'sent' | 'failed' }, or 503 { error: 'not_configured' } while no model key is set
// (the site then says so honestly and offers Telegram).
//
// The model is reached through any OpenAI-compatible API, so the provider can change without code:
//   AI_KEY       — secret (wrangler secret put AI_KEY)
//   AI_BASE_URL  — var, e.g. https://api.proxyapi.ru/openai/v1 (rubles) or https://api.openai.com/v1
//   AI_MODEL     — var, e.g. gpt-4o-mini
// What Алекс knows is worker/knowledge.js, built from the site's texts by `npm run knowledge`.
import { KNOWLEDGE, SERVICES } from './knowledge.js';
import { clean, cors, deliver, stamp } from './lead.js';

const MAX_TURNS = 16;
const MAX_CHARS = 1500;
// a light brake per worker instance: enough against one visitor looping, not a wall against a botnet
const WINDOW_MS = 10 * 60 * 1000;
const PER_WINDOW = 40;
const seen = new Map();

const SYSTEM = `Ты — Алекс, AI-ассистент на сайте агентства Alex Media (основатель — Александр Гирин).
Отвечай по-русски, коротко и простыми словами: 2–5 предложений, без канцелярита, без markdown-заголовков и таблиц; списки — только если без них непонятно.
Говори от лица агентства («мы»). Объясняй выгоду для бизнеса человека, а не термины.

Правила:
- Опирайся только на сведения ниже. Не выдумывай цифры, цены, сроки, гарантии и кейсы. Если цена или цифра помечена как уточняемая — так и скажи. Если ответа нет в сведениях — честно скажи, что уточнит Александр, и предложи оставить контакт.
- Кейсы называй с цифрой из статьи и давай ссылку на статью, если человек спрашивает о результатах.
- Не обещай результат; объясняй, от чего он зависит.
- Вопросы не про маркетинг, сайты, AI и услуги агентства вежливо возвращай к теме.
- Заявка. Когда человек хочет начать, обсудить проект, записаться на разбор или просит перезвонить — попроси телефон или ник в Telegram и коротко уточни задачу. Вызывай leave_lead только когда человек сам написал свой контакт в чате. После отправки скажи, что Александр или менеджер свяжется в рабочее время.
- Не проси и не принимай пароли, данные карт и паспортов.

Сведения об агентстве:
${KNOWLEDGE}`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'leave_lead',
      description: 'Передать заявку агентству (в Telegram и на почту). Вызывать только когда человек сам дал телефон или ник в Telegram.',
      parameters: {
        type: 'object',
        properties: {
          contact: { type: 'string', description: 'Телефон или ник в Telegram — как написал человек' },
          service: { type: 'string', enum: SERVICES, description: 'Услуга, ближайшая к запросу' },
          task: { type: 'string', description: 'Задача человека своими словами, 1–3 предложения: ниша, что хочет получить' }
        },
        required: ['contact', 'task']
      }
    }
  }
];

const json = (origin, status, data) => new Response(JSON.stringify(data), { status, headers: { ...cors(origin), 'Content-Type': 'application/json; charset=utf-8' } });

const tooMany = (ip) => {
  const now = Date.now();
  const hits = (seen.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  seen.set(ip, hits);
  if (seen.size > 5000) seen.clear();
  return hits.length > PER_WINDOW;
};

const complete = async (env, messages) => {
  const res = await fetch(`${env.AI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.AI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: env.AI_MODEL, messages, tools: TOOLS, max_tokens: 600, temperature: 0.4 })
  });
  if (!res.ok) throw new Error(`model ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.choices?.[0]?.message;
};

export const handleChat = async (request, env, origin) => {
  if (!env.AI_KEY || !env.AI_BASE_URL || !env.AI_MODEL) return json(origin, 503, { error: 'not_configured' });
  if (tooMany(request.headers.get('CF-Connecting-IP') ?? 'unknown')) return json(origin, 429, { error: 'rate_limited' });

  let body;
  try {
    body = await request.json();
  } catch {
    return json(origin, 400, { error: 'bad_json' });
  }
  if (clean(body.website)) return json(origin, 200, { reply: '' });

  const turns = Array.isArray(body.messages) ? body.messages.slice(-MAX_TURNS) : [];
  const history = turns
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_CHARS) }));
  if (history.at(-1)?.role !== 'user') return json(origin, 400, { error: 'no_question' });

  const messages = [{ role: 'system', content: SYSTEM }, ...history];
  let lead;
  try {
    let message = await complete(env, messages);
    // one round of tools at most: the model may hand over a request, then says so in words
    const calls = message?.tool_calls ?? [];
    if (calls.length) {
      messages.push(message);
      for (const call of calls) {
        let result = { ok: false, error: 'unknown_tool' };
        if (call.function?.name === 'leave_lead') {
          let args = {};
          try {
            args = JSON.parse(call.function.arguments || '{}');
          } catch {}
          const contact = clean(args.contact);
          if (!contact) result = { ok: false, error: 'no_contact' };
          else {
            const sent = await deliver(
              env,
              { stage: 'contact', contact, service: clean(args.service), task: clean(args.task), source: 'чат с Алексом на сайте' },
              stamp(clean(body.page) || origin)
            );
            lead = sent ? 'sent' : 'failed';
            result = sent ? { ok: true } : { ok: false, error: 'delivery_failed' };
          }
        }
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
      }
      message = await complete(env, messages);
    }
    const reply = (message?.content ?? '').trim();
    return json(origin, 200, { reply: reply || 'Не получилось ответить — попробуйте переформулировать вопрос.', lead });
  } catch (error) {
    console.error(error);
    return json(origin, 502, { error: 'model_failed', lead });
  }
};
