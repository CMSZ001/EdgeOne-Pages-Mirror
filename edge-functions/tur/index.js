export async function onRequest(context) {
  const request = context.request;
  const method = request.method.toUpperCase();

  if (!['GET', 'HEAD'].includes(method)) {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(request.url);

  if (url.href.length > 2048) {
    return new Response('Request URI Too Long', { status: 414 });
  }

  const path = url.pathname;

  // 输入清理：防止路径遍历和注入
  if (path.includes('..') || /[^a-zA-Z0-9._/-]/.test(path)) {
    return new Response('Bad Request', { status: 400 });
  }

  if (path === "/tur") {
    return Response.redirect(url.origin + "/tur/", 301);
  }

  if (path === "/tur/") {
    return fetch("https://tur-mirror.pages.dev/");
  }
}