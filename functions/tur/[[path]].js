export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const PREFIX = "/tur";

  // ----------- dists 文件 -----------
  if (path.startsWith(PREFIX + "/dists/") && !path.endsWith("/")) {
    const upstreamPath = path.slice(PREFIX.length);
    const upstreamUrl =
      `https://cdn.jsdmirror.com/gh/termux-user-repository/dists@master${upstreamPath}`;
    return fetch(upstreamUrl, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  // ----------- pool 文件 -----------
  if (path.startsWith(PREFIX + "/pool/") && !path.endsWith("/")) {
    const fileName = path.split("/").pop();
    const safeName = encodeURIComponent(fileName.replace(/[^a-zA-Z0-9._-]/g, "."));
    const upstreamUrl =
      `https://github.com/termux-user-repository/dists/releases/download/0.1/${safeName}`;
    return fetch(upstreamUrl, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  // ----------- 其他（目录 or 页面）-----------
  const upstreamPath = path.startsWith(PREFIX) ? path.slice(PREFIX.length) : path;
  const pagesUrl = `https://tur-mirror.pages.dev${upstreamPath}`;
  return fetch(pagesUrl, {
    headers: { "Cache-Control": "no-store" },
  });
}
