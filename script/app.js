const { createApp, reactive, ref, onMounted } = Vue;

function absUrl(value, baseUrl) {
  if (!value) return value;
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return value;
  }
}

function rewriteSrcset(srcsetValue, baseUrl) {
  if (!srcsetValue) return srcsetValue;
  // srcset format: "url [descriptor], url [descriptor], ..."
  // We keep descriptors after each URL as-is.
  return srcsetValue
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const pieces = part.split(/\s+/);
      const url = pieces[0];
      if (!url) return part;
      const abs = absUrl(url, baseUrl);
      return [abs, ...pieces.slice(1)].join(" ");
    })
    .join(", ");
}

function rewriteRelativeUrls(container, baseUrl) {
  // Common attributes
  container.querySelectorAll("img[src]").forEach((el) => {
    el.setAttribute("src", absUrl(el.getAttribute("src"), baseUrl));
  });

  container.querySelectorAll("img[srcset]").forEach((el) => {
    const srcset = el.getAttribute("srcset");
    el.setAttribute("srcset", rewriteSrcset(srcset, baseUrl));
  });

  container.querySelectorAll("source[srcset]").forEach((el) => {
    const srcset = el.getAttribute("srcset");
    el.setAttribute("srcset", rewriteSrcset(srcset, baseUrl));
  });

  container.querySelectorAll("source[src]").forEach((el) => {
    el.setAttribute("src", absUrl(el.getAttribute("src"), baseUrl));
  });

  container.querySelectorAll("a[href]").forEach((el) => {
    el.setAttribute("href", absUrl(el.getAttribute("href"), baseUrl));
  });

  container.querySelectorAll("link[href]").forEach((el) => {
    el.setAttribute("href", absUrl(el.getAttribute("href"), baseUrl));
  });
}

async function fetchAndInject(href) {
  const container = document.getElementById("article");
  if (!container) return;

  container.innerHTML = '<div style="color:#6b7280;padding:24px 0;">加载中...</div>';

  const baseUrl = new URL(href, window.location.href).href;
  const res = await fetch(href, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc.body) throw new Error("Invalid HTML: missing body");

  container.innerHTML = doc.body.innerHTML;
  rewriteRelativeUrls(container, baseUrl);
}

createApp({
  setup() {
    const activeHref = ref(null);

    const categories = reactive([
      {
        key: "cpp",
        title: "C++",
        open: true,
        summaryClass: "nav-category--cpp",
        items: [
          { href: "./page/cpp/枚举类型的特点及用法.html", text: "C++ 枚举类型：特点、用法与注意事项" },
          { href: "./page/cpp/无锁队列的实现原理.html", text: "C++ 高性能编程之无锁队列的实现原理" },
          { href: "./page/cpp/限制继承的方法有哪些.html", text: 'C++ 各版本"限制继承"都有哪些招？' },
          { href: "./page/cpp/匿名namespace有什么作用.html", text: "C++ 匿名 namespace 有什么作用？" },
        ],
      },
      {
        key: "golang",
        title: "Go",
        open: false,
        summaryClass: "nav-category--go",
        items: [{ href: "./page/golang/怎么实现chan的读写超时.html", text: "Go 中怎么实现 chan 读写超时？" }],
      },
      {
        key: "tech-arch",
        title: "技术架构",
        open: false,
        summaryClass: "nav-category--arch",
        items: [
          { href: "./page/tech-arch/A2A-proto.html", text: "什么是 A2A？" },
          { href: "./page/tech-arch/数据库选型方案.html", text: "2026 数据库选型指南：从 OLTP 到时序一网打尽" },
        ],
      },
    ]);

    async function openArticle(href) {
      activeHref.value = href;
      try {
        await fetchAndInject(href);
      } catch (e) {
        const container = document.getElementById("article");
        if (container) {
          container.innerHTML = `<div style="color:#b91c1c;padding:24px 0;">加载失败：${String(e && e.message ? e.message : e)}</div>`;
        }
      }
    }

    function onToggle(cat, e) {
      // e.target is the <details> element
      cat.open = Boolean(e.target && e.target.open);
    }

    onMounted(() => {
      // Default view
      openArticle("./page/welcome.html");
    });

    return { categories, activeHref, openArticle, onToggle };
  },
}).mount("#app");

