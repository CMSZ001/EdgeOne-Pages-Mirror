// 仅处理 /tur → /tur/
export default async function (context) {
  const location = new URL('/tur/', context.request.url); // 真实域名由平台自动补上
  return Response.redirect(location.pathname, 301);
}