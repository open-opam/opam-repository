// A package's README as the catalogue shows it. It is the author's text on the
// registry's own address, so it is sanitised as GitHub sanitises a README:
// HTML in it is parsed first, then everything that could run is removed. Code
// is highlighted after that, so the only styles left are the highlighter's.

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import rehypeShiki from "@shikijs/rehype";
import type { Root, Element, RootContent } from "hast";

export type Bases = {
  links: string; // https://github.com/<owner>/<name>/blob/<commit>/
  images: string; // https://raw.githubusercontent.com/<owner>/<name>/<commit>/
  // A file the catalogue has a page for, by its address as resolved, and that
  // page: the registry's own documents link to each other's pages.
  pages?: ReadonlyMap<string, string>;
};

// A relative link or image points into the repository at the README's commit.
// An address with a scheme was already allowed or removed by the sanitiser.
function resolve(address: string, base: string): string {
  if (address.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(address) || address.startsWith("//")) return address;
  return new URL(address.replace(/^\/+/, ""), base).href;
}

function resolveRelative(bases: Bases) {
  const walk = (node: Root | RootContent) => {
    if (node.type === "element") {
      const e = node as Element;
      if (e.tagName === "a" && typeof e.properties.href === "string") {
        const resolved = resolve(e.properties.href, bases.links);
        const cut = resolved.indexOf("#");
        const address = cut < 0 ? resolved : resolved.slice(0, cut);
        const page = bases.pages?.get(address);
        e.properties.href = page ? page + resolved.slice(address.length) : resolved;
      }
      if (e.tagName === "img" && typeof e.properties.src === "string") e.properties.src = resolve(e.properties.src, bases.images);
      // A <picture>'s sources, as a README gives a logo for each theme: each
      // address in the list, its width or density kept.
      if ((e.tagName === "source" || e.tagName === "img") && typeof e.properties.srcSet === "string")
        e.properties.srcSet = e.properties.srcSet
          .split(",")
          .map((entry) => entry.trim().replace(/^\S+/, (address) => resolve(address, bases.images)))
          .join(", ");
    }
    if ("children" in node) for (const child of node.children) walk(child);
  };
  return () => (tree: Root) => walk(tree);
}

export async function renderReadme(markdown: string, bases: Bases): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize)
    .use(resolveRelative(bases))
    .use(rehypeShiki, {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
      lazy: true,
      fallbackLanguage: "text",
    })
    .use(rehypeStringify)
    .process(markdown);
  return String(file);
}
