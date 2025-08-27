export default async function (request) {
  const url = new URL(request.url);
  const path = url.pathname;          // 一定以 /tur/ 开头

  /* 1. /tur/dists/… → jsdmirror 不缓存 */
  if (path.startsWith('/tur/dists/') && !path.endsWith('/')) {
    const upstreamPath = path.replace('/tur', '');
    // 去掉中间的空格 ↓↓↓
    const upstream = `https://cdn.jsdmirror.com/gh/termux-user-repository/dists@master${upstreamPath}`;
    const resp = await fetch(upstream);
    if (!resp.ok) return resp;        // 把上游错误原样透传
    const headers = new Headers(resp.headers);
    headers.set('Cache-Control', 'no-store');
    return new Response(resp.body, { status: resp.status, headers });
  }

  /* 2. /tur/pool/… → GitHub Release 0.1，缓存 1 天 */
  if (path.startsWith('/tur/pool/') && !path.endsWith('/')) {
    const fileName = path.split('/').pop();
    const safeFile = encodeURIComponent(fileName.replace(/[^a-zA-Z0-9._-]/g, '.'));
    // 去掉中间的空格 ↓↓↓
    const upstream = `https://github.com/termux-user-repository/dists/releases/download/0.1/${safeFile}`;
    const resp = await fetch(upstream);
    if (!resp.ok) return resp;
    const headers = new Headers(resp.headers);
    headers.set('Cache-Control', 'public, max-age=86400');
    return new Response(resp.body, { status: resp.status, headers });
  }

  /* 3. 其余 → tur-mirror.pages.dev 不缓存 */
  const upstreamPath = path.replace('/tur', '');
  // 去掉中间的空格 ↓↓↓
  const upstream = `https://tur-mirror.pages.dev${upstreamPath}`;
  const resp = await fetch(upstream, { headers: request.headers });
  const headers = new Headers(resp.headers);
  headers.set('Cache-Control', 'no-store');
  return new Response(resp.body, { status: resp.status, headers });
}