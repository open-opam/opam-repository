// One day's download totals, as stats.ts writes them to the stats branch and
// the catalogue reads them back: each archive the registry names, by its
// address, with GitHub's download_count for it that day.

import { z } from "astro/zod";

export const snapshot = z.object({
  taken_at: z.iso.datetime(),
  assets: z.array(z.object({ url: z.url(), downloads: z.number().int().nonnegative() })),
});

export type Snapshot = z.infer<typeof snapshot>;

// A release asset's address: https://github.com/<owner>/<name>/releases/download/<tag>/<file>.
export function releaseAsset(url: string): { repository: string; tag: string; file: string } | undefined {
  const m = url.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/releases\/download\/([^/]+)\/([^/]+)$/);
  return m ? { repository: m[1], tag: decodeURIComponent(m[2]), file: decodeURIComponent(m[3]) } : undefined;
}
