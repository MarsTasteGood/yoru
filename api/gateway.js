// The existing public Sites service owns the persistent DB and midnight checks.
// This Vercel Function keeps the browser on its Vercel/custom domain.
const BACKEND = 'https://yoru-birthday-notes.matsurio.chatgpt.site';
const BOARD = /^boards\/[a-f0-9]{32}$/;
const GIFT = /^boards\/[a-f0-9]{32}\/gifts$/;
const LIMIT = 20000;

function reply(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(data));
}

async function bodyOf(req) {
  if (req.body !== undefined && req.body !== null) {
    return typeof req.body === 'string' || Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > LIMIT) throw new Error('too_large');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://local.invalid');
  // Vercel can present either the original or rewritten URL.
  const original = url.pathname.startsWith('/api/boards') ? url.pathname.slice(5) : null;
  const route = original ?? req.query?.route ?? url.searchParams.get('route');
  if (typeof route !== 'string' || !(route === 'boards' || route === 'boards/lookup' || BOARD.test(route) || GIFT.test(route))) {
    return reply(res, 404, { error: 'ページが見つかりません。', code: 'not_found' });
  }
  const expectedMethod = BOARD.test(route) ? 'GET' : 'POST';
  if (req.method !== expectedMethod) {
    res.setHeader('Allow', expectedMethod);
    return reply(res, 405, { error: '送信方法を確認してください。', code: 'method_not_allowed' });
  }
  let body;
  if (req.method === 'POST') {
    // Reject cross-origin browser writes before the server-to-server hop.
    const origin = req.headers.origin;
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    if (req.headers['sec-fetch-site'] === 'cross-site') return reply(res, 403, { error: 'このページからもう一度送信してください。', code: 'origin_mismatch' });
    if (origin) {
      try {
        const parsed = new URL(origin);
        if (!['https:', 'http:'].includes(parsed.protocol) || parsed.host !== host) throw new Error();
      } catch { return reply(res, 403, { error: 'このページからもう一度送信してください。', code: 'origin_mismatch' }); }
    }
    if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
      return reply(res, 415, { error: '送信形式を確認してください。', code: 'invalid_content_type' });
    }
    if (Number(req.headers['content-length']) > LIMIT) return reply(res, 413, { error: '入力が長すぎます。', code: 'too_large' });
    try { body = await bodyOf(req); } catch { return reply(res, 413, { error: '入力が長すぎます。', code: 'too_large' }); }
    if (Buffer.byteLength(body) > LIMIT) return reply(res, 413, { error: '入力が長すぎます。', code: 'too_large' });
    try { JSON.parse(body.toString()); } catch { return reply(res, 400, { error: '入力内容を確認してください。', code: 'invalid_json' }); }
  }
  try {
    const upstream = await fetch(`${BACKEND}/api/${route}`, {
      method: req.method,
      headers: { 'Accept': 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    // Never return login HTML, follow a login redirect, or forward cookies/tokens.
    if (upstream.status >= 300 && upstream.status < 400 || !upstream.headers.get('content-type')?.includes('application/json')) {
      return reply(res, 502, { error: '保存先に接続できません。サイト管理者に連絡してください。', code: 'backend_unavailable' });
    }
    return reply(res, upstream.status, await upstream.json());
  } catch {
    return reply(res, 502, { error: '接続できませんでした。少し待ってから、もう一度試してね。', code: 'backend_unavailable' });
  }
}
