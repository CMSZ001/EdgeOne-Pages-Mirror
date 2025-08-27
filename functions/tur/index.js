// functions/tur/index.js
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.pathname === "/tur") {
    return Response.redirect(url.origin + "/tur/", 301);
  }
  return fetch(context.request); // 防止死循环
}
