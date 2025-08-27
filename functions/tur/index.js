export async function onRequest(context) {
  const url = new URL(context.request.url);

  // 只有在没有斜杠时重定向
  if (url.pathname === "/tur") {
    url.pathname = "/tur/";
    return Response.redirect(url.toString(), 301);
  }

  // 如果是 /tur/，直接代理到 tur-mirror，不要用 context.next()
  if (url.pathname === "/tur/") {
    const resp = await fetch("https://tur-mirror.pages.dev/");
    return new Response(resp.body, {
      status: resp.status,
      headers: {
        ...resp.headers,
        "Cache-Control": "no-store", // 不缓存
      },
    });
  }
}
