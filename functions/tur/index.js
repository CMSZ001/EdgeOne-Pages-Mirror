export async function onRequest(context) {
  const url = new URL(context.request.url);
  url.pathname = "/tur/";
  return Response.redirect(url.toString(), 301);
}
