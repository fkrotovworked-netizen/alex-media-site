// Lead receiver for the Alex Media site: a Cloudflare Worker.
// The site on GitHub Pages has no backend, so the form posts here; the worker keeps the
// secrets and forwards each request to a Telegram chat and to an email inbox.
//
// Secrets (wrangler secret put …):
//   TG_TOKEN      — bot token from @BotFather
//   TG_CHAT_ID    — chat (or group) the bot writes to
//   RESEND_KEY    — API key from resend.com
//   LEAD_EMAIL    — where letters go (without an own domain Resend sends only to the account's email)
// Vars (wrangler.toml): ALLOWED_ORIGINS — comma-separated origins allowed to post.

const LIMIT = 2000;

const clean = (value) => (typeof value === 'string' ? value.trim().slice(0, LIMIT) : '');

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const cors = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  Vary: 'Origin'
});

/** The same request in two forms: rows for Telegram's HTML and for the letter. */
const describe = (lead) => {
  const rows = [
    ['Контакт', lead.contact],
    ['Услуга', lead.service],
    ['Задача', lead.task],
    ['Ниша', lead.niche],
    ['Бюджет', lead.budget]
  ].filter(([, value]) => value);
  const title = lead.stage === 'details' ? 'Дополнение к заявке' : 'Новая заявка с сайта';
  return { title, rows };
};

const toTelegram = async (env, { title, rows }, ref) => {
  const text = [`<b>${title}</b>`, ...rows.map(([k, v]) => `<b>${k}:</b> ${escape(v)}`), `<i>${escape(ref)}</i>`].join('\n');
  const res = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true })
  });
  if (!res.ok) throw new Error(`telegram ${res.status}`);
};

const toEmail = async (env, { title, rows }, ref) => {
  const html = `<h2>${title}</h2>${rows.map(([k, v]) => `<p><b>${k}:</b> ${escape(v).replace(/\n/g, '<br>')}</p>`).join('')}<p style="color:#888">${escape(ref)}</p>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Alex Media <onboarding@resend.dev>', to: [env.LEAD_EMAIL], subject: `${title}: ${rows[0]?.[1] ?? ''}`, html })
  });
  if (!res.ok) throw new Error(`email ${res.status}`);
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim());
    if (!allowed.includes(origin)) return new Response('forbidden', { status: 403 });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== 'POST') return new Response('method', { status: 405, headers: cors(origin) });

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('bad json', { status: 400, headers: cors(origin) });
    }
    // a hidden field people never see: bots fill it
    if (clean(body.website)) return new Response(null, { status: 204, headers: cors(origin) });

    const lead = {
      stage: body.stage === 'details' ? 'details' : 'contact',
      contact: clean(body.contact),
      service: clean(body.service),
      task: clean(body.task),
      niche: clean(body.niche),
      budget: clean(body.budget)
    };
    if (!lead.contact) return new Response('contact required', { status: 422, headers: cors(origin) });

    const message = describe(lead);
    const ref = `${clean(body.page) || origin} · ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} МСК`;
    // both channels are tried; the request counts as delivered if at least one took it
    const results = await Promise.allSettled([toTelegram(env, message, ref), toEmail(env, message, ref)]);
    const delivered = results.some((r) => r.status === 'fulfilled');
    for (const r of results) if (r.status === 'rejected') console.error(r.reason);
    return new Response(delivered ? null : 'not delivered', { status: delivered ? 204 : 502, headers: cors(origin) });
  }
};
