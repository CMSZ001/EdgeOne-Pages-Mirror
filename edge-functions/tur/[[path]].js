const PREFIX = '/tur';

async function fetchWithEdgeOneCache(url, request) {
  const headers = new Headers();
  headers.set("host", request.headers.get("host") || "");
  const edgeoneRequest = new Request(url, { method: 'GET', headers });
  return fetch(edgeoneRequest);
}

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname;
  const pathArray = path.split("/");

  if (path === PREFIX + "/") {
    return fetchWithEdgeOneCache("https://tur-mirror.pages.dev/", request);
  }

  if (path.startsWith(PREFIX + '/dists/') && !path.endsWith('/')) {
    const upstreamPath = path.slice(PREFIX.length).replace(/^\/+/, '');
    const upstreamUrl = "https://cdn.jsdelivr.net/gh/termux-user-repository/dists@master/" + upstreamPath;
    const response = await fetch(upstreamUrl);
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Cache-Control", "no-store");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }

  if (path.startsWith(PREFIX + '/pool/') && !path.endsWith('/')) {
    const packageDebName = pathArray.at(-1);
    const packageDebNameModified = encodeURIComponent(packageDebName.replace(/[^a-zA-Z0-9._-]/g, '.'));
    const packageName = packageDebName.split("_")[0];
    const xgetUrl = `https://xget.xi-xu.me/gh/termux-user-repository/dists/releases/download/${packageName}/${packageDebNameModified}`;
    const githubUrl = `https://github.com/termux-user-repository/dists/releases/download/${packageName}/${packageDebNameModified}`;
    const fallbackUrl = `https://github.com/termux-user-repository/dists/releases/download/0.1/${packageDebNameModified}`;

    try {
      const headResponse = await fetch(xgetUrl, { method: "HEAD" });
      if (headResponse.ok) {
        const xgetResp = await fetchWithEdgeOneCache(xgetUrl, request);
        if (xgetResp.ok && xgetResp.body) {
          const newHeaders = new Headers(xgetResp.headers);
          if (xgetResp.headers.get("accept-ranges")) {
            newHeaders.set("accept-ranges", xgetResp.headers.get("accept-ranges"));
          }
          newHeaders.set("Cache-Control", "public, max-age=86400");
          return new Response(xgetResp.body, {
            status: xgetResp.status,
            statusText: xgetResp.statusText,
            headers: newHeaders
          });
        } else {
          const githubResp = await fetchWithEdgeOneCache(githubUrl, request);
          if (githubResp.ok && githubResp.body) {
            const newHeaders = new Headers(githubResp.headers);
            if (githubResp.headers.get("accept-ranges")) {
              newHeaders.set("accept-ranges", githubResp.headers.get("accept-ranges"));
            }
            newHeaders.set("Cache-Control", "public, max-age=86400");
            return new Response(githubResp.body, {
              status: githubResp.status,
              statusText: githubResp.statusText,
              headers: newHeaders
            });
          }
        }
      } else {
        const githubHead = await fetch(githubUrl, { method: "HEAD" });
        if (githubHead.ok) {
          const githubResp = await fetchWithEdgeOneCache(githubUrl, request);
          if (githubResp.ok && githubResp.body) {
            const newHeaders = new Headers(githubResp.headers);
            if (githubResp.headers.get("accept-ranges")) {
              newHeaders.set("accept-ranges", githubResp.headers.get("accept-ranges"));
            }
            newHeaders.set("Cache-Control", "public, max-age=86400");
            return new Response(githubResp.body, {
              status: githubResp.status,
              statusText: githubResp.statusText,
              headers: newHeaders
            });
          }
        }
      }
    } catch (e) {}

    const fbResp = await fetchWithEdgeOneCache(fallbackUrl, request);
    const newHeaders = new Headers(fbResp.headers);
    newHeaders.set("Cache-Control", "public, max-age=86400");
    return new Response(fbResp.body, {
      status: fbResp.status,
      statusText: fbResp.statusText,
      headers: newHeaders
    });
  }

  const upstreamPath = path.startsWith(PREFIX) ? path.slice(PREFIX.length) : path;
  const pagesUrl = `https://tur-mirror.pages.dev${upstreamPath}`;
  const fallbackResponse = await fetch(pagesUrl);
  const fallbackHeaders = new Headers(fallbackResponse.headers);
  fallbackHeaders.set("Cache-Control", "no-store");
  return new Response(fallbackResponse.body, {
    status: fallbackResponse.status,
    statusText: fallbackResponse.statusText,
    headers: fallbackHeaders
  });
}