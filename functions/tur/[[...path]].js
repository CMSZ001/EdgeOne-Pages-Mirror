const PREFIX = "/tur";

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // 1. /tur/dists/ -> jsdmirror (不缓存)
  if (path.startsWith(PREFIX + "/dists/") && !path.endsWith("/")) {
    const upstreamPath = path.slice(PREFIX.length); // 去掉 /tur
    const githubUrl = `https://cdn.jsdmirror.com/gh/termux-user-repository/dists@master${upstreamPath}`;
    const resp = await fetch(githubUrl);
    return new Response(resp.body, {
      status: resp.status,
      headers: {
        ...resp.headers,
        "Cache-Control": "no-store", // 不缓存
      },
    });
  }

  // 2. /tur/pool/ -> GitHub Releases (固定 tag=0.1，缓存 1 天)
  if (path.startsWith(PREFIX + "/pool/") && !path.endsWith("/")) {
    const fileName = path.split("/").pop();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "."); // 清理非法字符
    const upstream = `https://gh.dpik.top/https://github.com/termux-user-repository/dists/releases/download/0.1/${encodeURIComponent(safeFileName)}`;
    const resp = await fetch(upstream);
    return new Response(resp.body, {
      status: resp.status,
      headers: {
        ...resp.headers,
        "Cache-Control": "public, max-age=86400", // 缓存 1 天
      },
    });
  }

  // 3. 其他情况 -> tur-mirror.pages.dev (不缓存)
  const upstreamPath = path.slice(PREFIX.length); // 去掉 /tur
  const pagesUrl = `https://tur-mirror.pages.dev${upstreamPath}`;
  const resp = await fetch(pagesUrl);
  return new Response(resp.body, {
    status: resp.status,
    headers: {
      ...resp.headers,
      "Cache-Control": "no-store", // 不缓存
    },
  });
}
