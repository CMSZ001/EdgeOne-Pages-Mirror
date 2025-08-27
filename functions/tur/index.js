// EdgeOne Pages Functions – mirror.acmsz.top
// 专门处理 /tur 和 /tur/

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname;

  // /tur → 301 跳转到 /tur/
  if (path === "/tur") {
    return Response.redirect(url.origin + "/tur/", 301);
  }

  // /tur/ → 映射到 tur-mirror.pages.dev 根目录
  if (path === "/tur/") {
    return fetch("https://tur-mirror.pages.dev/");
  }
}
