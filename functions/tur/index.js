export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.pathname === "/tur") {
    // /tur → /tur/
    url.pathname = "/tur/";
    return Response.redirect(url.toString(), 301);
  }

  // 如果已经是 /tur/ 就放行，让 [[...path]].js 接管
  return fetch(context.request);
}
