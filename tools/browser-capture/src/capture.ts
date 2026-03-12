import * as browser from "./agent-browser.js"
import type { CapturedElement, ComponentInfo, FrameworkInfo } from "./types.js"

/** agent-browser eval でフレームワーク検出（tegakariロジック移植） */
export async function detectFramework(): Promise<FrameworkInfo | null> {
  const code = `
    (() => {
      let framework = null;
      let metaFramework = null;
      try { if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) framework = "React"; } catch {}
      try { if (window.__VUE__ || window.__vue__) framework = "Vue"; } catch {}
      try {
        if (window.__NEXT_DATA__) metaFramework = "Next.js (Pages Router)";
        else if (window.__next_f || window.__next_router_prefetch_for) metaFramework = "Next.js (App Router)";
        else if (document.getElementById("__next") && document.querySelector('script[src*="/_next/"]')) metaFramework = "Next.js";
      } catch {}
      try {
        if (window.__NUXT__ || window.__NUXT_DATA__) metaFramework = "Nuxt";
        else if (document.getElementById("__nuxt") || document.getElementById("__layout")) metaFramework = "Nuxt";
      } catch {}
      if (!framework && !metaFramework) return "null";
      return JSON.stringify({ framework, metaFramework });
    })()
  `
  const result = await browser.evaluate(code)
  if (result === "null" || !result) return null
  try {
    return JSON.parse(result) as FrameworkInfo
  } catch {
    return null
  }
}

/** agent-browser eval でコンポーネント情報収集 */
export async function collectComponentInfo(
  selector: string
): Promise<ComponentInfo | null> {
  const code = `
    (() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return "null";
      const fiberKey = Object.keys(el).find(k => k.startsWith("__reactFiber$"));
      if (fiberKey) {
        let fiber = el[fiberKey];
        const hierarchy = [];
        let current = fiber;
        while (current) {
          if (typeof current.type === "function" || typeof current.type === "object") {
            const name = current.type?.displayName || current.type?.name;
            if (name) hierarchy.unshift(name);
          }
          current = current.return;
        }
        const props = fiber.memoizedProps ? Object.keys(fiber.memoizedProps).slice(0, 20).reduce((acc, k) => {
          try {
            const v = fiber.memoizedProps[k];
            if (typeof v === "function") acc[k] = "fn";
            else if (typeof v === "object" && v !== null) acc[k] = "{...}";
            else acc[k] = v;
          } catch { acc[k] = "[error]"; }
          return acc;
        }, {}) : undefined;
        return JSON.stringify({ framework: "react", hierarchy, props });
      }
      const vueInstance = el.__vue__ || el.__vueParentComponent;
      if (vueInstance) {
        const hierarchy = [];
        let inst = vueInstance;
        while (inst) {
          const name = inst.$options?.name || inst.type?.name || inst.type?.__name;
          if (name) hierarchy.unshift(name);
          inst = inst.$parent || inst.parent;
        }
        return JSON.stringify({ framework: "vue", hierarchy });
      }
      return "null";
    })()
  `
  const result = await browser.evaluate(code)
  if (result === "null" || !result) return null
  try {
    return JSON.parse(result) as ComponentInfo
  } catch {
    return null
  }
}

/** CSSセレクタで要素情報を取得 */
export async function inspectElement(
  selector: string
): Promise<CapturedElement | null> {
  const code = `
    (() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return "null";
      const attrs = {};
      for (const attr of el.attributes) {
        if (["class", "id", "name", "type", "href", "src", "alt", "title", "placeholder",
             "role", "aria-label", "aria-describedby", "data-testid"].includes(attr.name)
            || attr.name.startsWith("data-") || attr.name.startsWith("aria-")) {
          attrs[attr.name] = attr.value;
        }
      }
      return JSON.stringify({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || "").trim().slice(0, 200),
        attributes: attrs,
      });
    })()
  `
  const result = await browser.evaluate(code)
  if (result === "null" || !result) return null
  try {
    const data = JSON.parse(result)
    return {
      ref: "",
      selector,
      tag: data.tag,
      text: data.text,
      attributes: data.attributes,
    }
  } catch {
    return null
  }
}
