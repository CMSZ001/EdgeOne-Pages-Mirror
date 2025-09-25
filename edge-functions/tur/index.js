export async function onRequest(context) {
  const request = context.request;
  const method = request.method.toUpperCase();

  if (!['GET', 'HEAD'].includes(method)) {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(request.url);

  // URL 长度限制
  if (url.href.length > 2048) {
    return new Response('Request URI Too Long', { status: 414 });
  }

  const path = url.pathname;

  if (path === "/tur") {
    return Response.redirect(url.origin + "/tur/", 301);
  }

  if (path === "/tur/") {
    return fetch("https://tur-mirror.pages.dev/");
  }
}