export async function onRequest(context) {
  const request = context.request;
  const method = request.method.toUpperCase();

  // 请求验证：只允许 GET 和 HEAD
  if (!['GET', 'HEAD'].includes(method)) {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/tur") {
    return Response.redirect(url.origin + "/tur/", 301);
  }

  if (path === "/tur/") {
    return fetch("https://tur-mirror.pages.dev/");
  }
}