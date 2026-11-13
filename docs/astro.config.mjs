import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import solid from "@astrojs/solid-js";
import tailwindcss from "@tailwindcss/vite";
import solidtype from "vite-plugin-solidtype";

// The registry's catalogue, published to GitHub Pages by
// .github/workflows/docs.yml on every push to main and after each download
// snapshot. `make docs` builds it into _build/docs from this checkout's
// packages/, .open-opam/ and stats branch, read by src/lib/registry.ts;
// nothing it builds is committed.
//
// Its interactive parts are islands: Solid components written in OCaml with
// solidtype and HeroUI's components, compiled by Melange into docs/_build
// (`make islands`), where `@islands/<name>.jsx` finds them. solidtype's plugin
// hands them to Solid's compiler and runs first.
const repository = fileURLToPath(new URL("..", import.meta.url));
const docs = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  site: "https://open-opam.org",
  base: "/",
  trailingSlash: "always",
  outDir: `${repository}_build/docs`,
  integrations: [solid()],
  vite: {
    plugins: [tailwindcss(), solidtype()],
    resolve: {
      alias: [{ find: /^@islands\/(.+)\.jsx$/, replacement: `${docs}_build/default/islands/out/islands/$1.jsx` }],
    },
  },
});
