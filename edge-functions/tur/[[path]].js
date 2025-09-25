const PREFIX = '/tur';

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname;

  // 最新官方 geo 获取方式
  const geo = request.eo?.geo;
  const country = geo?.countryName?.toLowerCase() ?? "unknown";
  const inChina = country === "cn";

  // ------------------ /tur/ 根路径 ------------------
  if (path === PREFIX + "/") {
    return fetch("https://tur-mirror.pages.dev/", {
      headers: { "Cache-Control": "no-store" }
    });
  }

  // ------------------ dists ------------------
  if (path.startsWith(PREFIX + '/dists/')) {
    if (!path.endsWith('/')) {
      let upstreamPath = path.slice(PREFIX.length);
      if (upstreamPath.startsWith('/')) {
        upstreamPath = upstreamPath.slice(1);
      }

      const upstreamUrls = inChina
        ? [
            `https://cdn.jsdmirror.com/gh/termux-user-repository/dists@master/${upstreamPath}`,
            `https://cdn.jsdmirror.cn/gh/termux-user-repository/dists@master/${upstreamPath}`,
            `https://fastly.jsdelivr.net/gh/termux-user-repository/dists@master/${upstreamPath}`,
          ]
        : [
            `https://cdn.jsdelivr.net/gh/termux-user-repository/dists@master/${upstreamPath}`,
            `https://fastly.jsdelivr.net/gh/termux-user-repository/dists@master/${upstreamPath}`,
            `https://testingcf.jsdelivr.net/gh/termux-user-repository/dists@master/${upstreamPath}`,
          ];

      try {
        const response = await Promise.any(upstreamUrls.map(u => fetch(u)));

        if (response.ok) {
          let newHeaders = new Headers(response.headers);
          newHeaders.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        }
      } catch (err) {
        return new Response("All dists upstreams failed: " + err, { status: 502 });
      }
    }
  }

  // ------------------ pool ------------------
  if (path.startsWith(PREFIX + '/pool/') && !path.endsWith('/')) {
    const fileName = path.split('/').pop();
    const safeName = encodeURIComponent(fileName.replace(/[^a-zA-Z0-9._-]/g, '.'));

    const upstreamUrls = inChina
      ? [
          `https://gh.dpik.top/https://github.com/termux-user-repository/dists/releases/download/0.1/${safeName}`,
          `https://ghfile.geekertao.top/https://github.com/termux-user-repository/dists/releases/download/0.1/${safeName}`,
          `https://gh.llkk.cc/https://github.com/termux-user-repository/dists/releases/download/0.1/${safeName}`,
          `https://gitproxy.click/https://github.com/termux-user-repository/dists/releases/download/0.1/${safeName}`,
          `https://ghfast.top/https://github.com/termux-user-repository/dists/releases/download/0.1/${safeName}`,
        ]
      : [
          `https://github.com/termux-user-repository/dists/releases/download/0.1/${safeName}`
        ];

    let lastError;
    for (const urlTry of upstreamUrls) {
      try {
        const response = await fetch(urlTry);
        if (response.ok) {
          let newHeaders = new Headers(response.headers);
          // 确保支持断点续传
          if (response.headers.get("accept-ranges")) {
            newHeaders.set("accept-ranges", response.headers.get("accept-ranges"));
          }
          newHeaders.set("Cache-Control", "public, max-age=604800"); // 7 天
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        } else {
          lastError = new Error(`Upstream ${urlTry} failed with status ${response.status}`);
        }
      } catch (err) {
        lastError = err;
      }
    }

    return new Response(`All pool upstreams failed: ${lastError}`, { status: 502 });
  }

  // ------------------ fallback ------------------
  const upstreamPath = path.startsWith(PREFIX) ? path.slice(PREFIX.length) : path;
  const pagesUrl = `https://tur-mirror.pages.dev${upstreamPath}`;
  return fetch(pagesUrl, {
    headers: { "Cache-Control": "no-store" }
  });
}