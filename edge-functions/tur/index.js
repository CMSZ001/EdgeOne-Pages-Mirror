export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.length > 2048) return new Response("URI Too Long", { status: 414 });
  if (path.includes("..")) return new Response("Bad Request", { status: 400 });

  if (path === "/tur") return Response.redirect(url.origin + "/tur/", 301);
  if (path === "/tur/") {
    return fetch("https://tur-mirror.pages.dev/", {
      version: "HTTP/2.0",
      eo: {
        timeoutSetting: {
          connectTimeout: 300000,
          readTimeout: 300000,
          writeTimeout: 300000
        }
      }
    });
  }

export async function onRequestHead(context) {
  return onRequestGet(context);
}
