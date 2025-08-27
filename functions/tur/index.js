export async function onRequest(context) {
  const url = new URL(context.request.url);
  return Response.redirect(url.origin + "/tur/", 301);
}