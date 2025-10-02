export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname;

  if (!["GET", "HEAD"].includes(request.method)) {
    return new Response("Method Not Allowed", { status: 405 });
  }
  if (path.length > 2048) {
    return new Response("URI Too Long", { status: 414 });
  }
  if (path.includes("..")) {
    return new Response("Bad Request", { status: 400 });
  }

  if (path === "/tur") {
    return Response.redirect(url.origin + "/tur/", 301);
  }

  if (path === "/tur/") {
    return fetch("https://tur-mirror.pages.dev/");
  }
}