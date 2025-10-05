const PREFIX = '/tur';
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;

async function fetchWithRetry(url, options = {}, attempt = 1) {
  try {
    const response = await fetch(url, {
      ...options,
      version: "HTTP/2.0",
      eo: {
        timeoutSetting: {
            connectTimeout: 300000,
            readTimeout: 300000,
            writeTimeout: 300000,
        }
      }
    });
    if (!response.ok && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_BASE * attempt));
      return fetchWithRetry(url, options, attempt + 1);
    }
    return response;
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_BASE * attempt));
      return fetchWithRetry(url, options, attempt + 1);
    }
    throw err;
  }
}

async function tryUrlsSequential(urls) {
  let lastError;
  for (const url of urls) {
    try {
      const resp = await fetchWithRetry(url);
      if (resp.ok && resp.body) return resp;
      else if (resp.status === 429) lastError = new Error(`Upstream ${url} returned 429`);
      else lastError = new Error(`Upstream ${url} failed with status ${resp.status}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.length > 2048) return new Response("URI Too Long", { status: 414 });
  if (path.includes("..")) return new Response("Bad Request", { status: 400 });

  const geo = request.eo?.geo;
  const country = geo?.countryCodeAlpha2?.toLowerCase() ?? "unknown";
  const inChina = country === "cn";

  // 首页
  if (path === PREFIX + "/") return fetch("https://tur-mirror.pages.dev/");

  // dists 下的具体文件
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
      return await tryUrlsSequential(upstreamUrls);
    } catch (err) {
      return new Response("All dists upstreams failed: " + err, { status: 502 });
    }
  }

  // pool 下的具体文件
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

    const upstreamUrls = inChina
      ? [
          `https://xget.xi-xu.me/gh/${(usePrimary ? primaryUrl : fallbackUrl).replace("https://github.com/", "")}`,
          `https://gh.dpik.top/${usePrimary ? primaryUrl : fallbackUrl}`,
          `https://ghfile.geekertao.top/${usePrimary ? primaryUrl : fallbackUrl}`,
          `https://gh.llkk.cc/${usePrimary ? primaryUrl : fallbackUrl}`,
          `https://gitproxy.click/${usePrimary ? primaryUrl : fallbackUrl}`,
          `https://ghfast.top/${usePrimary ? primaryUrl : fallbackUrl}`
        ]
      : [usePrimary ? primaryUrl : fallbackUrl];

    try {
      return await tryUrlsSequential(upstreamUrls);
    } catch (err) {
      if (usePrimary) {
        const fallbackUrls = inChina
          ? [
              `https://xget.xi-xu.me/gh/${fallbackUrl.replace("https://github.com/", "")}`,
              `https://gh.dpik.top/${fallbackUrl}`,
              `https://ghfile.geekertao.top/${fallbackUrl}`,
              `https://gh.llkk.cc/${fallbackUrl}`,
              `https://gitproxy.click/${fallbackUrl}`,
              `https://ghfast.top/${fallbackUrl}`
            ]
          : [fallbackUrl];
        try {
          return await tryUrlsSequential(fallbackUrls);
        } catch (err2) {
          return new Response("All pool upstreams failed: " + err2, { status: 502 });
        }
      }
      return new Response("All pool upstreams failed: " + err, { status: 502 });
    }
  }

  // 其它情况 → fallback 代理到 pages
  const upstreamPath = path.startsWith(PREFIX) ? path.slice(PREFIX.length) : path;
  const pagesUrl = `https://tur-mirror.pages.dev${upstreamPath}`;
  return fetchWithRetry(pagesUrl);
}

export async function onRequestHead(context) {
  return onRequestGet(context);
}
