const REQUEST_TIMEOUT = 30000; // 30秒，可根据需要修改

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

  // 输入清理
  if (path.includes('..') || /[^a-zA-Z0-9._/-]/.test(path)) {
    return new Response('Bad Request', { status: 400 });
  }

  if (path === "/tur") {
    return Response.redirect(url.origin + "/tur/", 301);
  }

  if (path === "/tur/") {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      return await fetch("https://tur-mirror.pages.dev/", { signal: controller.signal });
    } catch (err) {
      if (err.name === 'AbortError') {
        return new Response('Request Timeout', { status: 504 });
      }
      throw err;
    } finally {
      clearTimeout(id);
    }
  }
}