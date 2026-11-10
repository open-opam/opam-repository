// What GitHub says of a repository's releases, by GitHub's API: for each
// asset, by its address, how often it has been downloaded since it was
// uploaded, and the day its release was published. The catalogue's build and
// stats.ts both ask here, so a count is read one way.

import { z } from "astro/zod";

export type Asset = { downloads: number; published?: string };

// GitHub's answer, validated where it enters: only what is read here. A draft
// has no published_at.
const releases = z.array(
  z.object({
    published_at: z.iso.datetime().nullable(),
    assets: z.array(z.object({ browser_download_url: z.string(), download_count: z.number().int().nonnegative() })),
  }),
);

// Every release of a repository, all pages of them. The build fails on any
// answer but a list, rather than ship a page with figures missing.
export async function assetsOf(repository: string): Promise<Map<string, Asset>> {
  const token = process.env.GITHUB_TOKEN;
  const found = new Map<string, Asset>();
  let next: string | undefined = `https://api.github.com/repos/${repository}/releases?per_page=100`;
  while (next) {
    const response = await fetch(next, {
      headers: { Accept: "application/vnd.github+json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!response.ok) throw new Error(`releases of ${repository}: GitHub answered ${response.status}`);
    for (const release of releases.parse(await response.json()))
      for (const asset of release.assets)
        found.set(asset.browser_download_url, {
          downloads: asset.download_count,
          published: release.published_at?.slice(0, 10),
        });
    next = response.headers.get("link")?.match(/<([^>]+)>;\s*rel="next"/)?.[1];
  }
  return found;
}
