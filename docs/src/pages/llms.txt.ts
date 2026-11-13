// The registry described for a model, per llmstxt.org: what it is, how to add
// it, its documents as Markdown, and every package at its latest version.
import type { APIRoute } from "astro";
import { packages, repository } from "../lib/registry";
import { documents, raw } from "../lib/documents";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export const GET: APIRoute = ({ site }) => {
  const page = (path: string) => new URL(base + path, site);
  // A synopsis is the author's text, kept to its one line.
  const line = (text: string) => text.replace(/\s+/g, " ").trim();
  const lines = [
    "# open-opam",
    "",
    "> Self-service opam repository. Open OCaml publishing for humans and agents.",
    "",
    `Add it with \`opam repo add open-opam https://github.com/${repository}.git\`.`,
    "",
    "## Docs",
    "",
    `- [Publish](${page("/publish/")}): Publish an OCaml package to open-opam from its GitHub release.`,
    ...documents.map((d) => `- [${d.title}](${raw(d)}): ${d.summary}`),
    "",
    "## Packages",
    "",
    ...packages.map((p) => `- [${p.name}](${page(`/packages/${p.name}/`)}): ${p.latest.version}${p.latest.synopsis ? `, ${line(p.latest.synopsis)}` : ""}`),
  ];
  return new Response(lines.join("\n") + "\n");
};
