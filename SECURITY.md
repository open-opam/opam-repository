# Security

## Reporting

Report a vulnerability, or a package you believe is malicious, through
[GitHub's private vulnerability reporting](https://github.com/open-opam/opam-repository/security/advisories/new).

## Scope

The validator in `open-opam/open-opam-cli`, this repository's workflows, the
registry, and any package published here.

## Response

The targets are acknowledgement within one business day, and a revocation
decision within one business day for active malware.

A revoked version stays listed, and opam refuses to install it. No registry can
uninstall from a switch, so anyone who already installed it keeps it until they
remove it; the record and the advisory say so.

## Safe harbour

Research carried out in good faith under this policy, which avoids harm to
users and their data and gives us reasonable time to respond before disclosure,
is welcome, and we will not pursue action against it.
