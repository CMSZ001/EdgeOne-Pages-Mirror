// functions/_middleware.js

import { handleTur } from "./tur.js";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // tur 仓库
  if (path.startsWith("/tur")) {
    return handleTur(context, path);
  }

  return fetch(context.request);
}
