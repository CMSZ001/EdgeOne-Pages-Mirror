export async function onRequest(context) {
  // 映射 /tur/ 到 tur-mirror.pages.dev 根目录
  return fetch("https://tur-mirror.pages.dev/");
}
