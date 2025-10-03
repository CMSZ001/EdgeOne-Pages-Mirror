const PREFIX = '/tur';

async function fetchWithEdgeOneCache(url, request) {
  const headers = new Headers({ host: request.headers.get("host") });
  return fetch(new Request(url, { method: 'GET', headers }));
}

export async function onRequest(context) {
  const request = context.request;
  const path = new URL(request.url).pathname;
  const pathArray = path.split("/");

  if (path === PREFIX + "/") {
    return fetchWithEdgeOneCache("https://tur-mirror.pages.dev/", request);
  }

  if (path.startsWith(PREFIX + '/dists/') && !path.endsWith('/')) {
    const upstreamUrl = "https://cdn.jsdelivr.net/gh/termux-user-repository/dists@master/" + path.slice(PREFIX.length).replace(/^\/+/, '');
    const res = await fetch(upstreamUrl);
    const headers = new Headers(res.headers);
    headers.set("Cache-Control", "no-store");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  }

  if (path.startsWith(PREFIX + '/pool/') && !path.endsWith('/')) {
    const packageDebName = pathArray.at(-1);
    const packageDebNameModified = encodeURIComponent(packageDebName.replace(/[^a-zA-Z0-9._-]/g, '.'));
    const fallbackUrls = [
      `https://xget.xi-xu.me/gh/termux-user-repository/dists/releases/download/0.1/${packageDebNameModified}`,
      `https://github.com/termux-user-repository/dists/releases/download/0.1/${packageDebNameModified}`
    ];

    let urlsToTry = fallbackUrls;
    try {
      const packageName = packageDebName.split("_").at(0);
      const primaryUrl = `https://github.com/termux-user-repository/dists/releases/download/${packageName}/${packageDebNameModified}`;
      if ((await fetch(primaryUrl, { method: "HEAD" })).ok) {
        urlsToTry = [
          `https://xget.xi-xu.me/gh/termux-user-repository/dists/releases/download/${packageName}/${packageDebNameModified}`,
          primaryUrl
        ];
      }
    } catch {}

    for (const url of urlsToTry) {
      try {
        const res = await fetchWithEdgeOneCache(url, request);
        if (res.ok) {
          const headers = new Headers(res.headers);
          if (res.headers.get("accept-ranges")) headers.set("accept-ranges", res.headers.get("accept-ranges"));
          headers.set("Cache-Control", "public, max-age=86400");
          return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
        }
      } catch {}
    }
    return new Response("All pool upstreams failed", { status: 502 });
  }

  const upstreamPath = path.startsWith(PREFIX) ? path.slice(PREFIX.length) : path;
  const res = await fetch(`https://tur-mirror.pages.dev${upstreamPath}`);
  const headers = new Headers(res.headers);
  headers.set("Cache-Control", "no-store");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}