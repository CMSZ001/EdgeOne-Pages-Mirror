async function handleRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.length > 2048) return new Response("URI Too Long", { status: 414 });
  if (path.includes("..")) return new Response("Bad Request", { status: 400 });

  if (path === "/tur") return Response.redirect(url.origin + "/tur/", 301);
  if (path === "/tur/") return fetch("https://tur-mirror.pages.dev/");
}

export { handleRequest as onRequestGet };
export { handleRequest as onRequestHead };