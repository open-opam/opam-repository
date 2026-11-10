DOCS_PORT ?= 4321
# The catalogue's islands are OCaml, built with solidtype as this registry
# publishes it: the switch takes it from the registry, as any author would.
SWITCH ?= open-opam-catalogue
OPAM := opam exec --switch=$(SWITCH) --

.DEFAULT_GOAL := help
.PHONY: help setup switch islands test docs docs-serve stats

help: ## list targets
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-11s %s\n", $$1, $$2}'

setup: docs/node_modules switch ## install the catalogue's dependencies

switch:
	@opam switch list --short | grep -qx '$(SWITCH)' || opam switch create $(SWITCH) ocaml-base-compiler.5.5.1 --no-install
	@opam repo list --switch=$(SWITCH) --short | grep -qx open-opam \
	  || opam repo add open-opam https://github.com/open-opam/opam-repository.git --this-switch --switch=$(SWITCH)
	opam update --switch=$(SWITCH) open-opam
	opam install --switch=$(SWITCH) --yes dune melange ppx_solidtype solidtype solidtype-kobalte solidtype-heroui

test: ## the scripts that judge a pull request and make an opam file match a record
	sh .github/scripts/test-apply-record.sh
	sh .github/scripts/test-gates.sh

docs/node_modules: docs/package.json docs/bun.lock
	@command -v bun >/dev/null 2>&1 || { echo "The catalogue needs Bun 1.3 or later."; exit 1; }
	cd docs && bun install --frozen-lockfile
	@touch docs/node_modules

islands: ## build the catalogue's islands with Melange
	cd docs && $(OPAM) dune build

docs: docs/node_modules islands ## build the catalogue from packages/, .open-opam/ and the stats branch
	cd docs && bun --bun astro build

docs-serve: docs ## serve the built catalogue
	cd docs && bun --bun astro preview --open --port $(DOCS_PORT)

stats: docs/node_modules ## print today's download totals, as stats.yml saves them
	cd docs && bun stats.ts
