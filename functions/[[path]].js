// EdgeOne Pages Functions – mirror.acmsz.top

const PREFIX = '/tur';   // 统一维护前缀

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname;

  // 访问 /tur 自动 301 到 /tur/
  if (path === PREFIX) {
    return Response.redirect(url.origin + PREFIX + '/', 301);
  }

  // 处理 dists 下游文件
  if (path.startsWith(PREFIX + '/dists/')) {
    if (!path.endsWith('/')) {
      let upstreamPath = path.slice(PREFIX.length); // 例如 "/dists/xxx"
      if (upstreamPath.startsWith('/')) {
        upstreamPath = upstreamPath.slice(1); // 去掉开头的 "/"
      }
      const githubUrl = `https://cdn.jsdmirror.com/gh/termux-user-repository/dists@master/${upstreamPath}`;

      let response = await fetch(githubUrl);
      response = new Response(response.body, response);
      response.headers.set("Cache-Control", "public, max-age=900"); // 15分钟缓存
      return response;
    }
  }

  // 处理 pool 下游文件
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

  // 默认回源到 pages
  const upstreamPath = path.startsWith(PREFIX) ? path.slice(PREFIX.length) : path;
  const pagesUrl = `https://tur-mirror.pages.dev${upstreamPath}`;
  return fetch(pagesUrl);
}
