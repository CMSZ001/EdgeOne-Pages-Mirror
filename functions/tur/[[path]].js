// EdgeOne Pages Functions – mirror.acmsz.top
// 按地理位置选择上游加速源

const PREFIX = '/tur';   // 统一维护前缀

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname;

  // 用户地理信息（EdgeOne 提供）
  const geo = context.geo || {};
  const country = (geo.country || "unknown").toLowerCase();

  // 判断是否在中国大陆
  const inChina = (country === "cn");

  // /tur/ → tur-mirror.pages.dev 根目录
  if (path === PREFIX + "/") {
    return fetch("https://tur-mirror.pages.dev/");
  }

  // ------------------ dists ------------------
  if (path.startsWith(PREFIX + '/dists/')) {
    if (!path.endsWith('/')) {
      let upstreamPath = path.slice(PREFIX.length);
      if (upstreamPath.startsWith('/')) {
        upstreamPath = upstreamPath.slice(1);
      }

      let upstreamUrl;
      if (inChina) {
        // 中国大陆用户 → 国内镜像
        upstreamUrl = `https://cdn.jsdmirror.com/gh/termux-user-repository/dists@master/${upstreamPath}`;
      } else {
        // 海外用户 → jsDelivr 官方
        upstreamUrl = `https://cdn.jsdelivr.net/gh/termux-user-repository/dists@master/${upstreamPath}`;
      }

      let response = await fetch(upstreamUrl);
      let newHeaders = new Headers(response.headers);
      newHeaders.set("Cache-Control", "public, max-age=900"); // 15分钟
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }
  }

  // ------------------ pool ------------------
  if (path.startsWith(PREFIX + '/pool/') && !path.endsWith('/')) {
    const fileName = path.split('/').pop();

    let upstreamUrl;
    if (inChina) {
      // 中国大陆用户 → 国内镜像 (gh.dpik.top)
      upstreamUrl =
        `https://gh.dpik.top/https://github.com/termux-user-repository/dists/releases/download/0.1/` +
        encodeURIComponent(fileName.replace(/[^a-zA-Z0-9._-]/g, '.'));
    } else {
      // 海外用户 → GitHub 官方 Releases
      upstreamUrl =
        `https://github.com/termux-user-repository/dists/releases/download/0.1/` +
        encodeURIComponent(fileName.replace(/[^a-zA-Z0-9._-]/g, '.'));
    }

    let response = await fetch(upstreamUrl);
    let newHeaders = new Headers(response.headers);
    newHeaders.set("Cache-Control", "public, max-age=86400"); // 1天
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  // ------------------ fallback ------------------
  const upstreamPath = path.startsWith(PREFIX) ? path.slice(PREFIX.length) : path;
  const pagesUrl = `https://tur-mirror.pages.dev${upstreamPath}`;
  return fetch(pagesUrl);
}
