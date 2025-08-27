const PREFIX = "/tur";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // 获取最后一段，判断是不是文件
  const segments = path.split("/");
  const lastSegment = segments[segments.length - 1];
  const isFile = lastSegment.includes(".");

  // 1. /tur/dists/ 下的文件 -> jsdmirror (不缓存)
  if (isFile && path.startsWith(PREFIX + "/dists/")) {
    const upstreamPath = path.slice(PREFIX.length); // 去掉 /tur
    const mirrorUrl = `https://cdn.jsdmirror.com/gh/termux-user-repository/dists@master${upstreamPath}`;
    return fetch(mirrorUrl, {
      headers: context.request.headers,
    });
  }

  // 2. /tur/pool/ 下的文件 -> GitHub Releases tag=0.1 (缓存 1 天)
  if (isFile && path.startsWith(PREFIX + "/pool/")) {
    const fileName = lastSegment; // 取文件名
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, ".");
    const upstream = `https://github.com/termux-user-repository/dists/releases/download/0.1/${encodeURIComponent(safeFileName)}`;
    const resp = await fetch(upstream, {
      headers: context.request.headers,
    });
    const newHeaders = new Headers(resp.headers);
    newHeaders.set("Cache-Control", "public, max-age=86400"); // 缓存 1 天
    return new Response(resp.body, {
      status: resp.status,
      headers: newHeaders,
    });
  }

  // 3. 其他情况 -> tur-mirror.pages.dev (不缓存)
  const upstreamPath = path.slice(PREFIX.length); // 去掉 /tur
  const pagesUrl = `https://tur-mirror.pages.dev${upstreamPath}`;
  const resp = await fetch(pagesUrl, {
    headers: context.request.headers,
  });
  const newHeaders = new Headers(resp.headers);
  newHeaders.set("Cache-Control", "no-store");
  return new Response(resp.body, {
    status: resp.status,
    headers: newHeaders,
  });
}
