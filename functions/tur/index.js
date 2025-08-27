export async function onRequest(context) {
  const url = new URL(context.request.url);
  url.pathname = "/tur/"; // 强制加尾斜杠
  return Response.redirect(url.toString(), 301);
}
