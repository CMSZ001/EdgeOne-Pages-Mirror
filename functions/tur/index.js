export async function onRequest(context) {
  const url = new URL(context.request.url);

  // 仅在没有斜杠时重定向
  if (url.pathname === "/tur") {
    url.pathname = "/tur/";
    return Response.redirect(url.toString(), 301);
  }

  // 如果已经是 /tur/，就交给默认的 Pages 静态路由或者 tur/[[...path]].js
  return context.next();
}
