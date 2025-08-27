export async function onRequest(context) {
  const url = new URL(context.request.url);

  // /tur -> 301 重定向到 /tur/
  if (url.pathname === "/tur") {
    url.pathname = "/tur/";
    return Response.redirect(url.toString(), 301);
  }

  // /tur/ -> tur-mirror 首页
  const resp = await fetch("https://tur-mirror.pages.dev/");
  return new Response(resp.body, {
    status: resp.status,
    headers: {
      ...resp.headers,
      "Cache-Control": "no-store",
    },
  });
}
