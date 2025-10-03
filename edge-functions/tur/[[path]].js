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

async function handleRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.length > 2048) return new Response("URI Too Long", { status: 414 });
  if (path.includes("..")) return new Response("Bad Request", { status: 400 });

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
    const packageName = fileName.split("_")[0];
    const primaryUrl = `https://github.com/termux-user-repository/dists/releases/download/${packageName}/${safeName}`;
    const fallbackUrl = `https://github.com/termux-user-repository/dists/releases/download/0.1/${safeName}`;

    let usePrimary = false;
    try {
      const headResp = await fetchWithRetry(primaryUrl, { method: "HEAD" });
      if (headResp.ok) usePrimary = true;
    } catch (e) {}

    async function tryUpstreams(baseUrl) {
      const upstreamUrls = inChina
        ? [
            `https://xget.xi-xu.me/gh/${baseUrl.replace("https://github.com/", "")}`,
            `https://gh.dpik.top/${baseUrl}`,
            `https://ghfile.geekertao.top/${baseUrl}`,
            `https://gh.llkk.cc/${baseUrl}`,
            `https://gitproxy.click/${baseUrl}`,
            `https://ghfast.top/${baseUrl}`
          ]
        : [
            `https://xget.xi-xu.me/gh/${baseUrl.replace("https://github.com/", "")}`,
            baseUrl
          ];
      let lastError;
      for (const urlTry of upstreamUrls) {
        try {
          const response = await fetchWithRetry(urlTry);
          if (response.ok && response.body) return response;
          else if (response.status === 429) lastError = new Error(`Upstream ${urlTry} returned 429, trying next`);
          else lastError = new Error(`Upstream ${urlTry} failed with status ${response.status}`);
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError;
    }

    try {
      return await tryUpstreams(usePrimary ? primaryUrl : fallbackUrl);
    } catch (err) {
      if (usePrimary) {
        try {
          return await tryUpstreams(fallbackUrl);
        } catch (err2) {
          return new Response(`All pool upstreams failed: ${err2}`, { status: 502 });
        }
      }
      return new Response(`All pool upstreams failed: ${err}`, { status: 502 });
    }
  }

  const upstreamPath = path.startsWith(PREFIX) ? path.slice(PREFIX.length) : path;
  const pagesUrl = `https://tur-mirror.pages.dev${upstreamPath}`;
  return fetchWithRetry(pagesUrl);
}

export { handleRequest as onRequestGet };
export { handleRequest as onRequestHead };