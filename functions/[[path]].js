// EdgeOne Pages Functions – mirror.acmsz.top

const PREFIX = '/tur';   // 这里统一维护前缀

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === PREFIX) {
    return Response.redirect(url.origin + PREFIX + '/', 301);
  }

  // dists 下游
  if (path.startsWith(PREFIX + '/dists/')) {
    if (!path.endsWith('/')) {
      const upstreamPath = path.slice(PREFIX.length); // 去掉 /tur
      const githubUrl = `https://cdn.jsdmirror.com/gh/termux-user-repository/dists@master/${upstreamPath}`;

      let response = await fetch(githubUrl);
      response = new Response(response.body, response);
      response.headers.set("Cache-Control", "public, max-age=900"); // 15分钟缓存
      return response;
    }
  }

  // pool 下游
  if (path.startsWith(PREFIX + '/pool/') && !path.endsWith('/')) {
    const fileName = path.split('/').pop();
    const upstream =
      `https://gh.dpik.top/https://github.com/termux-user-repository/dists/releases/download/0.1/` +
      encodeURIComponent(fileName.replace(/[^a-zA-Z0-9._-]/g, '.'));

    let response = await fetch(upstream);
    response = new Response(response.body, response);
    response.headers.set("Cache-Control", "public, max-age=86400"); // 1天缓存
    return response;
  }

  // 默认回源 pages
  const upstreamPath = path.startsWith(PREFIX) ? path.slice(PREFIX.length) : path;
  const pagesUrl = `https://tur-mirror.pages.dev${upstreamPath}`;
  return fetch(pagesUrl);
}
