// Every page search engines should index: a package's latest version is
// indexed as its package page, so its version page is left out.
import type { APIRoute } from "astro";
import { packages } from "../lib/registry";
import { documents, href } from "../lib/documents";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export const GET: APIRoute = ({ site }) => {
  const paths = [
    "/",
    "/packages/",
    "/publish/",
    ...documents.map((d) => href(d.slug).slice(base.length)),
    ...packages.flatMap((p) => [
      `/packages/${p.name}/`,
      ...p.versions.filter((v) => v.version !== p.latest.version).map((v) => `/packages/${p.name}/${v.version}/`),
    ]),
  ];
  const urls = paths.map((path) => `  <url><loc>${new URL(base + path, site)}</loc></url>`).join("\n");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { "Content-Type": "application/xml" },
  });
};
