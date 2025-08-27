// 处理 /tur/后面的全部路径
export default async function (request, context) {
  const url = new URL(request.url);
  const path = url.pathname;          // 一定是 /tur/xxx 形式

  /* 1. /tur/dists/... → jsdmirror 不缓存 */
  if (path.startsWith('/tur/dists/') && !path.endsWith('/')) {
    const upstreamPath = path.replace('/tur', '');
    const upstream = `https://cdn.jsdmirror.com/gh/termux-user-repository/dists@master${upstreamPath}`;
    const resp = await fetch(upstream);
    const newHeaders = new Headers(resp.headers);
    newHeaders.set('Cache-Control', 'no-store');
    return new Response(resp.body, { status: resp.status, headers: newHeaders });
  }

  /* 2. /tur/pool/... → GitHub Release 0.1，缓存 1 天 */
  if (path.startsWith('/tur/pool/') && !path.endsWith('/')) {
    const fileName = path.split('/').pop();
    const safeFile = encodeURIComponent(fileName.replace(/[^a-zA-Z0-9._-]/g, '.'));
    const upstream = `https://github.com/termux-user-repository/dists/releases/download/0.1/${safeFile}`;
    const resp = await fetch(upstream);
    const newHeaders = new Headers(resp.headers);
    newHeaders.set('Cache-Control', 'public, max-age=86400');
    return new Response(resp.body, { status: resp.status, headers: newHeaders });
  }

  /* 3. 其余 → tur-mirror.pages.dev 不缓存 */
  const upstreamPath = path.replace('/tur', '');
  const upstream = `https://tur-mirror.pages.dev${upstreamPath}`;
  const resp = await fetch(upstream, { headers: request.headers });
  const newHeaders = new Headers(resp.headers);
  newHeaders.set('Cache-Control', 'no-store');
  return new Response(resp.body, { status: resp.status, headers: newHeaders });
}