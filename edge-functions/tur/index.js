const REQUEST_TIMEOUT = 30000; // 30秒，可根据需要修改
const MAX_RETRIES = 3;         // 最大重试次数
const RETRY_DELAY_BASE = 1000; // 重试延迟基数(ms)

async function fetchWithRetry(url, options = {}, attempt = 1) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
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
    if (err.name === 'AbortError') {
      throw new Error('Request Timeout');
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

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

  if (path.includes('..') || /[^a-zA-Z0-9._/-]/.test(path)) {
    return new Response('Bad Request', { status: 400 });
  }

  if (path === "/tur") {
    return Response.redirect(url.origin + "/tur/", 301);
  }

  if (path === "/tur/") {
    try {
      return await fetchWithRetry("https://tur-mirror.pages.dev/", { redirect: 'follow', keepalive: true });
    } catch (err) {
      if (err.message === 'Request Timeout') {
        return new Response('Request Timeout', { status: 504 });
      }
      throw err;
    }
  }
}