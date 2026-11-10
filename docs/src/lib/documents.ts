// The registry's own documents, each a page of the catalogue: the footer and
// the publish page link to these pages, never to the files on GitHub, and a
// document's link to another document leads to that one's page too.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderReadme } from "./readme";
import { repository } from "./registry";

export type Slug = "governance" | "security" | "disputes";
export type Document = { slug: Slug; file: string; title: string };

export const documents: readonly Document[] = [
  { slug: "governance", file: "GOVERNANCE.md", title: "Governance" },
  { slug: "security", file: "SECURITY.md", title: "Security" },
  { slug: "disputes", file: "DISPUTES.md", title: "Disputes" },];

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
// The build runs in docs/, and the documents are at the registry's root.
const root = resolve(process.cwd(), "..");
const files = `https://github.com/${repository}/blob/main/`;

export function href(slug: Slug): string {
  return `${base}/${slug}/`;
}

export function render(document: Document): Promise<string> {
  return renderReadme(readFileSync(resolve(root, document.file), "utf8"), {
    links: files,
    images: `https://raw.githubusercontent.com/${repository}/main/`,
    pages: new Map(documents.map((d) => [`${files}${d.file}`, href(d.slug)])),
  });
}
