// functions/tur/[...path].js

export async function onRequest(context) {
  const { request, waitUntil } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const PREFIX = '/tur';
  const cache = caches.default;

  // /tur → 301 跳转
  if (path === PREFIX) {
    return Response.redirect(url.origin + PREFIX + '/', 301);
  }

  // /tur/dists/* → 不缓存，直接回源
  if (path.startsWith(PREFIX + '/dists/') && !path.endsWith('/')) {
    const upstreamPath = path.slice(PREFIX.length); // 去掉 /tur
    const githubUrl = `https://cdn.jsdmirror.com/gh/termux-user-repository/dists@master/${upstreamPath}`;
    return fetch(new Request(githubUrl, request));
  }

  // /tur/pool/* → 缓存 1 天
  if (path.startsWith(PREFIX + '/pool/') && !path.endsWith('/')) {
    const fileName = path.split('/').pop();
    const upstream =
      `https://gh.dpik.top/https://github.com/termux-user-repository/dists/releases/download/0.1/` +
      encodeURIComponent(fileName.replace(/[^a-zA-Z0-9._-]/g, '.'));
    const req = new Request(upstream, request);

    let resp = await cache.match(req);
    if (!resp) {
      resp = await fetch(req);
      resp = new Response(resp.body, resp);
      resp.headers.set("Cache-Control", "s-maxage=86400"); // 1 天
      waitUntil(cache.put(req, resp.clone()));
    }
    return resp;
  }

  // 默认转发 tur-mirror.pages.dev
  const upstreamPath = path.slice(PREFIX.length);
  const pagesUrl = `https://tur-mirror.pages.dev${upstreamPath}`;
  return fetch(new Request(pagesUrl, request));
}
