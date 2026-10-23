/**
 * Cleaning HTML that came out of a document (Word, EPUB, rendered Markdown) before it
 * goes on the page: DOMPurify takes out scripts and anything that could run, and the
 * hook below also stops the document from loading anything from other sites (tracking
 * pixels, fonts, stylesheets): only pictures carried inside the file (data: URLs)
 * show. Links open in a new tab, and only http(s) and mailto ones are kept.
 */
import DOMPurify from "dompurify";

let purifier: ReturnType<typeof DOMPurify> | null = null;
/** How many remote pictures the last call took out. */
let blocked = 0;

const SAFE_LINK = /^(https?:|mailto:)/i;
const LOCAL_SOURCE = /^(data:image\/|blob:)/i;

/** CSS without url(…)s that point anywhere but inside the file. */
export function stripRemoteUrls(css: string): string {
  return css
    .replace(/@import[^;]+;?/gi, "")
    .replace(/url\(\s*(['"]?)(?!data:)[^)]*\1\s*\)/gi, "none");
}

function instance(): ReturnType<typeof DOMPurify> {
  if (purifier) return purifier;
  purifier = DOMPurify(window);
  purifier.addHook("afterSanitizeAttributes", (node) => {
    if (node.hasAttribute("href")) {
      const href = node.getAttribute("href") ?? "";
      if (node.localName === "a" && SAFE_LINK.test(href)) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer nofollow");
      } else if (
        !href.startsWith("#") &&
        !(node.localName === "image" && LOCAL_SOURCE.test(href))
      ) {
        node.removeAttribute("href");
      }
    }
    for (const name of [
      "src",
      "srcset",
      "poster",
      "xlink:href",
      "background",
    ]) {
      const value = node.getAttribute(name);
      if (value === null) continue;
      if (name === "src" && LOCAL_SOURCE.test(value)) continue;
      node.removeAttribute(name);
      if (node.localName === "img" || node.localName === "image") blocked++;
    }
    const style = node.getAttribute("style");
    if (style) node.setAttribute("style", stripRemoteUrls(style));
  });
  purifier.addHook("uponSanitizeElement", (node, data) => {
    if (data.tagName === "style" && node.textContent)
      node.textContent = stripRemoteUrls(node.textContent);
  });
  return purifier;
}

export interface Sanitized {
  fragment: DocumentFragment;
  /** Pictures from other sites that were left out. */
  blockedImages: number;
}

export function sanitizeHtml(
  html: string,
  options: { styles?: boolean } = {},
): Sanitized {
  blocked = 0;
  const fragment = instance().sanitize(html, {
    RETURN_DOM_FRAGMENT: true,
    FORCE_BODY: true,
    ADD_TAGS: options.styles ? ["style"] : [],
    FORBID_TAGS: [
      "form",
      "input",
      "button",
      "textarea",
      "select",
      "iframe",
      "frame",
      "object",
      "embed",
      "link",
      "meta",
      "base",
      "audio",
      "video",
      "source",
      ...(options.styles ? [] : ["style"]),
    ],
    FORBID_ATTR: ["srcdoc", "formaction", "ping"],
  });
  return { fragment, blockedImages: blocked };
}
