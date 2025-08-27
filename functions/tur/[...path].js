// functions/tur/[...path].js

export async function onRequest(context) {
  const { request, waitUntil } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const PREFIX = "/tur";
  const cache = caches.default;

  // ✅ 如果正好是 "/tur/"，不要重定向，直接转发到 pages
  if (path === PREFIX + "/") {
    const pagesUrl = `https://tur-mirror.pages.dev/`;
    return fetch(new Request(pagesUrl, request));
  }

  // /tur/dists/* → 不缓存
  if (path.startsWith(PREFIX + "/dists/") && !path.endsWith("/")) {
    const upstreamPath = path.slice(PREFIX.length);
    const githubUrl = `https://cdn.jsdmirror.com/gh/termux-user-repository/dists@master/${upstreamPath}`;
    return fetch(new Request(githubUrl, request));
  }

  // /tur/pool/* → 缓存 1 天
  if (path.startsWith(PREFIX + "/pool/") && !path.endsWith("/")) {
    const fileName = path.split("/").pop();
    const upstream =
      `https://gh.dpik.top/https://github.com/termux-user-repository/dists/releases/download/0.1/` +
      encodeURIComponent(fileName.replace(/[^a-zA-Z0-9._-]/g, "."));
    const req = new Request(upstream, request);

    let resp = await cache.match(req);
    if (!resp) {
      resp = await fetch(req);
      resp = new Response(resp.body, resp);
      resp.headers.set("Cache-Control", "s-maxage=86400");
      waitUntil(cache.put(req, resp.clone()));
      resp.headers.set("x-edge-cache", "miss");
    } else {
      resp = new Response(resp.body, resp);
      resp.headers.set("x-edge-cache", "hit");
    }
    return resp;
  }

  // 其他 tur/* → 转发到 tur-mirror.pages.dev
  const upstreamPath = path.slice(PREFIX.length);
  const pagesUrl = `https://tur-mirror.pages.dev${upstreamPath}`;
  return fetch(new Request(pagesUrl, request));
}
