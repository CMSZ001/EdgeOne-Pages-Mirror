const PREFIX = "/tur";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // 判断是不是文件（有扩展名，或者明确不是以 / 结尾）
  const segments = path.split("/");
  const lastSegment = segments[segments.length - 1];
  const isFile = lastSegment.includes("."); // 简单判断文件

  // 1. /tur/dists/ 下的文件 -> jsdmirror (不缓存)
  if (isFile && path.startsWith(PREFIX + "/dists/")) {
    const upstreamPath = path.slice(PREFIX.length); // 去掉 /tur
    const mirrorUrl = `https://cdn.jsdmirror.com/gh/termux-user-repository/dists@master${upstreamPath}`;
    const resp = await fetch(mirrorUrl);
    return new Response(resp.body, {
      status: resp.status,
      headers: {
        ...resp.headers,
        "Cache-Control": "no-store",
      },
    });
  }

  // 2. /tur/pool/ 下的文件 -> GitHub Releases tag=0.1 (缓存 1 天)
  if (isFile && path.startsWith(PREFIX + "/pool/")) {
    const fileName = lastSegment; // pool 只取最后一段作为文件名
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, ".");
    const upstream = `https://github.com/termux-user-repository/dists/releases/download/0.1/${encodeURIComponent(safeFileName)}`;
    const resp = await fetch(upstream);
    return new Response(resp.body, {
      status: resp.status,
      headers: {
        ...resp.headers,
        "Cache-Control": "public, max-age=86400", // 1 天
      },
    });
  }

  // 3. 其他情况 -> tur-mirror (不缓存)
  const upstreamPath = path.slice(PREFIX.length); // 去掉 /tur
  const pagesUrl = `https://tur-mirror.pages.dev${upstreamPath}`;
  const resp = await fetch(pagesUrl);
  return new Response(resp.body, {
    status: resp.status,
    headers: {
      ...resp.headers,
      "Cache-Control": "no-store",
    },
  });
}
