// EdgeOne Pages Functions – mirror.acmsz.top
// 支持地理分流 & 多代理 fallback，兼容 APT 大文件流式下载

const PREFIX = '/tur';   // 统一维护前缀

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const path = url.pathname;

  // 用户地理信息（EdgeOne 提供）
  const geo = context.geo || {};
  const country = (geo.country || "unknown").toLowerCase();

  // 是否中国大陆
  const inChina = (country === "cn");

  // ------------------ /tur/ 根路径 ------------------
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
      newHeaders.set("X-Upstream-Used", upstreamUrl); // 调试用，可删
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
    const safeName = encodeURIComponent(fileName.replace(/[^a-zA-Z0-9._-]/g, '.'));

    let upstreamUrls;
    if (inChina) {
      // 中国大陆使用多个代理源，依次尝试
      upstreamUrls = [
        `https://gh.dpik.top/https://github.com/termux-user-repository/dists/releases/download/0.1/${safeName}`,
        `https://ghfile.geekertao.top/https://github.com/termux-user-repository/dists/releases/download/0.1/${safeName}`,
        `https://gh.llkk.cc/https://github.com/termux-user-repository/dists/releases/download/0.1/${safeName}`,
        `https://gitproxy.click/https://github.com/termux-user-repository/dists/releases/download/0.1/${safeName}`,
        `https://ghfast.top/https://github.com/termux-user-repository/dists/releases/download/0.1/${safeName}`,
      ];
    } else {
      // 海外用户直连 GitHub
      upstreamUrls = [
        `https://github.com/termux-user-repository/dists/releases/download/0.1/${safeName}`
      ];
    }

    let lastError;
    for (const urlTry of upstreamUrls) {
      try {
        let response = await fetch(urlTry);
        if (response.ok) {
          let newHeaders = new Headers(response.headers);
          newHeaders.set("Cache-Control", "public, max-age=86400"); // 1天
          newHeaders.set("X-Upstream-Used", urlTry); // 调试用，可删
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        } else {
          lastError = new Error(`Upstream ${urlTry} failed with status ${response.status}`);
        }
      } catch (err) {
        lastError = err;
      }
    }

    // 全部失败 → 返回 502
    return new Response(`All upstreams failed: ${lastError}`, { status: 502 });
  }

  // ------------------ fallback ------------------
  const upstreamPath = path.startsWith(PREFIX) ? path.slice(PREFIX.length) : path;
  const pagesUrl = `https://tur-mirror.pages.dev${upstreamPath}`;
  return fetch(pagesUrl);
}
