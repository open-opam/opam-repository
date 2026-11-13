// The registry's own documents, each a page of the catalogue: the footer and
// the publish page link to these pages, never to the files on GitHub, and a
// document's link to another document leads to that one's page too.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderReadme } from "./readme";
import { repository } from "./registry";

export type Slug = "governance" | "security" | "disputes";
// A document's summary is its page's description, and its line in llms.txt.
export type Document = { slug: Slug; file: string; title: string; summary: string };

export const documents: readonly Document[] = [
  { slug: "governance", file: "GOVERNANCE.md", title: "Governance", summary: "How open-opam is run: checks decide, not people." },
  { slug: "security", file: "SECURITY.md", title: "Security", summary: "How to report a vulnerability or a malicious package." },
  { slug: "disputes", file: "DISPUTES.md", title: "Disputes", summary: "How to raise a dispute over a package name, or a legal takedown request." },
];

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
// The build runs in docs/, and the documents are at the registry's root.
const root = resolve(process.cwd(), "..");
const files = `https://github.com/${repository}/blob/main/`;
// A document's Markdown, as llms.txt links to it.
export const raw = (document: Document) => `https://raw.githubusercontent.com/${repository}/main/${document.file}`;

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
