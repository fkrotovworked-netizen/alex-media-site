// The site's one small backend, a Cloudflare Worker: the forms' requests (lead.js) and the assistant Алекс (chat.js).
//   POST /       — a request from a form (the address the site already uses)
//   POST /lead   — the same
//   POST /chat   — a message to Алекс
import { handleChat } from './chat.js';
import { cors, handleLead } from './lead.js';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim());
    if (!allowed.includes(origin)) return new Response('forbidden', { status: 403 });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== 'POST') return new Response('method', { status: 405, headers: cors(origin) });

    const { pathname } = new URL(request.url);
    if (pathname === '/chat') return handleChat(request, env, origin);
    return handleLead(request, env, origin);
  }
};
