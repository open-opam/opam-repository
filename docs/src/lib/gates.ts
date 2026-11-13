// The gates a release must pass, in the order the registry runs them, as the
// release of open-opam the registry runs names them.
export const gates: ReadonlyArray<readonly [name: string, text: string]> = [
  ["Allowed files", "The pull request only adds one release's opam files, and an owners record for a new name."],
  ["Release proof", "The release is published, immutable and attested, and its archive's digest agrees."],
  ["Archive equals tag", "The archive holds exactly the tag's files, or for a dune project the tag's files after dune subst."],
  ["Exact match", "Each opam file is byte for byte what the release generates, and declares x-open-opam: true."],
  ["Name ownership", "The name is this repository's: first-come, or the one official opam names for it. Its author isn't blocked."],
  ["Metadata and standard", "opam lint passes, and the project has a README, an .mli and a test."],
  ["Author's CI", "Every check on the tag's commit finished, at least one passed, and none failed."],
  ["Install", "The packages build and install in a clean switch."],
];
