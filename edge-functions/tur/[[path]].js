const PREFIX = '/tur';
const REQUEST_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;

async function fetchWithRetry(url, options = {}, attempt = 1) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    if (!response.ok && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_BASE * attempt));
      return fetchWithRetry(url, options, attempt + 1);
    }
    return response;
  } catch (err) {
    clearTimeout(id);
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_BASE * attempt));
      return fetchWithRetry(url, options, attempt + 1);
    }
    throw err;
  }
}

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname;

  if (!["GET", "HEAD"].includes(request.method)) {
    return new Response("Method Not Allowed", { status: 405 });
  }
  if (path.length > 2048) {
    return new Response("URI Too Long", { status: 414 });
  }
  if (path.includes("..")) {
    return new Response("Bad Request", { status: 400 });
  }

  const geo = request.eo?.geo;
  const country = geo?.countryCodeAlpha2?.toLowerCase() ?? "unknown";
  const inChina = country === "cn";

  if (path === PREFIX + "/") {
    return fetchWithRetry("https://tur-mirror.pages.dev/");
  }

  if (path.startsWith(PREFIX + '/dists/') && !path.endsWith('/')) {
    let upstreamPath = path.slice(PREFIX.length);
    if (upstreamPath.startsWith('/')) upstreamPath = upstreamPath.slice(1);

    const upstreamUrls = inChina
      ? [
          `https://cdn.jsdmirror.com/gh/termux-user-repository/dists@master/${upstreamPath}`,
          `https://cdn.jsdmirror.cn/gh/termux-user-repository/dists@master/${upstreamPath}`,
          `https://fastly.jsdelivr.net/gh/termux-user-repository/dists@master/${upstreamPath}`
        ]
      : [
          `https://cdn.jsdelivr.net/gh/termux-user-repository/dists@master/${upstreamPath}`,
          `https://fastly.jsdelivr.net/gh/termux-user-repository/dists@master/${upstreamPath}`,
          `https://testingcf.jsdelivr.net/gh/termux-user-repository/dists@master/${upstreamPath}`
        ];

    try {
      const response = await Promise.any(upstreamUrls.map(u => fetchWithRetry(u)));
      return response;
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
          `https://ghfast.top/https://github.com/termux-user-repository/dists/releases/download/0.1/${safeName}`
        ]
      : [
          `https://xget.xi-xu.me/gh/termux-user-repository/dists/releases/download/0.1/${safeName}`,
          `https://github.com/termux-user-repository/dists/releases/download/0.1/${safeName}`
        ];

    let lastError;
    for (const urlTry of upstreamUrls) {
      try {
        const response = await fetchWithRetry(urlTry);
        if (response.ok && response.body) {
          return response;
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
  return fetchWithRetry(pagesUrl);
}