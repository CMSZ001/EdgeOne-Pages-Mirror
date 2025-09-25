const PREFIX = '/tur';

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname;

  const geo = request.eo?.geo;
  const country = geo?.countryName?.toLowerCase() ?? "unknown";
  const inChina = country === "cn";

  const acceptEncoding = request.headers.get("accept-encoding") || "";
  let encoding = "gzip";
  if (acceptEncoding.includes("deflate") && !acceptEncoding.includes("gzip")) {
    encoding = "deflate";
  }

  if (path === PREFIX + "/") {
    return fetch("https://tur-mirror.pages.dev/", {
      headers: { "Cache-Control": "no-store" }
    });
  }

  if (path.startsWith(PREFIX + '/dists/') && !path.endsWith('/')) {
    let upstreamPath = path.slice(PREFIX.length);
    if (upstreamPath.startsWith('/')) upstreamPath = upstreamPath.slice(1);

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

  if (path.startsWith(PREFIX + '/pool/') && !path.endsWith('/')) {
    const fileName = path.split('/').pop();
    const safeName = encodeURIComponent(fileName.replace(/[^a-zA-Z0-9._-]/g, '.'));

    const upstreamUrls = inChina
      ? [
          `https://xget.xi-xu.me/gh/termux-user-repository/dists/releases/download/0.1/${safeName}`,
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
          if (response.headers.get("accept-ranges")) {
            newHeaders.set("accept-ranges", response.headers.get("accept-ranges"));
          }
          newHeaders.set("Cache-Control", "public, max-age=604800");

          let bodyStream = response.body;
          if (encoding && typeof CompressionStream !== "undefined") {
            bodyStream = bodyStream.pipeThrough(new CompressionStream(encoding));
            newHeaders.set("Content-Encoding", encoding);
          }

          return new Response(bodyStream, {
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

  const upstreamPath = path.startsWith(PREFIX) ? path.slice(PREFIX.length) : path;
  const pagesUrl = `https://tur-mirror.pages.dev${upstreamPath}`;
  const fallbackResponse = await fetch(pagesUrl, {
    headers: { "Cache-Control": "no-store" }
  });

  let fallbackHeaders = new Headers(fallbackResponse.headers);
  let fallbackBody = fallbackResponse.body;
  if (encoding && typeof CompressionStream !== "undefined") {
    fallbackBody = fallbackBody.pipeThrough(new CompressionStream(encoding));
    fallbackHeaders.set("Content-Encoding", encoding);
  }

  return new Response(fallbackBody, {
    status: fallbackResponse.status,
    statusText: fallbackResponse.statusText,
    headers: fallbackHeaders
  });
}