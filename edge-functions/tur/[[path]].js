const PREFIX = '/tur';

async function fetchWithKeepAlive(url) {
  return fetch(url, {
    redirect: 'follow',
    keepalive: true,
  });
}

export async function onRequest(context) {
  const request = context.request;
  const method = request.method.toUpperCase();

  if (!['GET', 'HEAD'].includes(method)) {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(request.url);

  if (url.href.length > 2048) {
    return new Response('Request URI Too Long', { status: 414 });
  }

  let path = url.pathname;

  // 输入清理：防止路径遍历和注入
  if (path.includes('..') || /[^a-zA-Z0-9._/-]/.test(path)) {
    return new Response('Bad Request', { status: 400 });
  }

  const geo = request.eo?.geo;
  const country = geo?.countryName?.toLowerCase() ?? "unknown";
  const inChina = country === "cn";

  if (path === PREFIX + "/") {
    return fetchWithKeepAlive("https://tur-mirror.pages.dev/");
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
      const response = await Promise.any(upstreamUrls.map(u => fetchWithKeepAlive(u)));
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
          `https://xget.xi-xu.me/gh/termux-user-repository/dists/releases/download/0.1/${safeName}`,
          `https://github.com/termux-user-repository/dists/releases/download/0.1/${safeName}`
        ];

    let lastError;
    for (const urlTry of upstreamUrls) {
      try {
        const response = await fetchWithKeepAlive(urlTry);
        if (response.ok && response.body) {
          let newHeaders = new Headers(response.headers);
          if (response.headers.get("accept-ranges")) {
            newHeaders.set("accept-ranges", response.headers.get("accept-ranges"));
          }
          newHeaders.set("Cache-Control", "public, max-age=604800");

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        } else if (response.status === 429) {
          lastError = new Error(`Upstream ${urlTry} returned 429, trying next`);
          continue;
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
  return fetchWithKeepAlive(pagesUrl);
}