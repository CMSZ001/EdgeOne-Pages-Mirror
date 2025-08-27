export async function onRequest(context) {
  const url = new URL(context.request.url);

  // /tur → 重定向到 /tur/
  if (url.pathname === "/tur") {
    url.pathname = "/tur/";
    return Response.redirect(url.toString(), 301);
  }

  // /tur/ → tur-mirror.pages.dev 根目录
  const upstream = "https://tur-mirror.pages.dev/";
  const resp = await fetch(upstream, {
    headers: context.request.headers,
  });

  const newHeaders = new Headers(resp.headers);
  newHeaders.set("Cache-Control", "no-store");
  return new Response(resp.body, {
    status: resp.status,
    headers: newHeaders,
  });
}
