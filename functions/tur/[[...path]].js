export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // 统一规则：/tur → /tur/
  if (path === "/tur") {
    url.pathname = "/tur/";
    return Response.redirect(url.toString(), 301);
  }

  // dists 下的文件 → jsdmirror，不缓存
  if (path.startsWith("/tur/dists/") && !path.endsWith("/")) {
    const upstreamPath = path.replace("/tur", "");
    const upstream = `https://cdn.jsdmirror.com/gh/termux-user-repository/dists@master${upstreamPath}`;
    return fetch(upstream, { cf: { cacheTtl: 0, cacheEverything: true } });
  }

  // pool 下的文件 → GitHub Release tag=0.1，缓存 1 天
  if (path.startsWith("/tur/pool/") && !path.endsWith("/")) {
    const fileName = path.split("/").pop();
    const safeFile = encodeURIComponent(fileName.replace(/[^a-zA-Z0-9._-]/g, "."));
    const upstream = `https://github.com/termux-user-repository/dists/releases/download/0.1/${safeFile}`;
    return fetch(upstream, { cf: { cacheTtl: 86400, cacheEverything: true } });
  }

  // 其他所有情况 → tur-mirror.pages.dev，不缓存
  const upstreamPath = path.replace("/tur", "");
  const upstream = `https://tur-mirror.pages.dev${upstreamPath}`;
  const resp = await fetch(upstream, {
    headers: context.request.headers,
  });
  const newHeaders = new Headers(resp.headers);
  newHeaders.set("Cache-Control", "no-store");
  return new Response(resp.body, {
    status: resp.status,
    headers: newHeaders,
  });
}
