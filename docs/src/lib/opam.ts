// An opam file read as far as the catalogue shows it: its fields' strings and
// lists, and each dependency with its constraint as the file writes it. Every
// file here passed `opam lint` when it was published, so this reads opam's
// grammar and refuses what does not fit it, rather than guessing.

type Token =
  | { kind: "string"; value: string; start: number; end: number }
  | { kind: "ident"; value: string; start: number; end: number }
  | { kind: "op"; value: string; start: number; end: number }
  | { kind: "punct"; value: string; start: number; end: number };

export type Value =
  | { kind: "string"; value: string }
  | { kind: "ident"; value: string }
  | { kind: "list"; items: Value[] }
  | { kind: "group"; items: Value[] }
  | { kind: "option"; value: Value; filter: string }
  | { kind: "binary"; op: string; left: Value; right: Value }
  | { kind: "prefix"; op: string; value: Value };

export type Item =
  | { kind: "field"; name: string; value: Value }
  | { kind: "section"; name: string; items: Item[] };

const identChar = /[A-Za-z0-9_+\-.]/;

function lex(text: string, file: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const fail = (what: string): never => {
    throw new Error(`${file}: ${what} at offset ${i}`);
  };
  while (i < text.length) {
    const c = text[i];
    if (/\s/.test(c)) {
      i++;
    } else if (c === "#") {
      while (i < text.length && text[i] !== "\n") i++;
    } else if (text.startsWith("(*", i)) {
      let depth = 0;
      do {
        if (text.startsWith("(*", i)) (depth++, (i += 2));
        else if (text.startsWith("*)", i)) (depth--, (i += 2));
        else if (i >= text.length) fail("an unclosed comment");
        else i++;
      } while (depth > 0);
    } else if (c === '"') {
      const start = i;
      const triple = text.startsWith('"""', i);
      i += triple ? 3 : 1;
      let value = "";
      for (;;) {
        if (i >= text.length) fail("an unclosed string");
        if (triple ? text.startsWith('"""', i) : text[i] === '"') break;
        if (text[i] === "\\") {
          const next = text[i + 1];
          if (next === "\n") {
            i += 2;
            while (text[i] === " " || text[i] === "\t") i++;
            continue;
          }
          value += { n: "\n", t: "\t", r: "\r", b: "\b" }[next] ?? next;
          i += 2;
        } else {
          value += text[i++];
        }
      }
      i += triple ? 3 : 1;
      tokens.push({ kind: "string", value, start, end: i });
    } else if ("[]{}()".includes(c)) {
      tokens.push({ kind: "punct", value: c, start: i, end: ++i });
    } else if (c === ":" && text[i + 1] !== "=") {
      tokens.push({ kind: "punct", value: ":", start: i, end: ++i });
    } else {
      const op = ["+=:", "=+=", "!=", "<=", ">=", "+=", "=+", ":=", "=:", "=", "<", ">", "&", "|", "!", "?"].find(
        (o) => text.startsWith(o, i),
      );
      if (op) {
        tokens.push({ kind: "op", value: op, start: i, end: (i += op.length) });
      } else if (identChar.test(c)) {
        const start = i;
        // A package's variable, `foo:installed`, is one name.
        while (i < text.length && (identChar.test(text[i]) || (text[i] === ":" && /[A-Za-z_]/.test(text[i + 1] ?? "")))) i++;
        tokens.push({ kind: "ident", value: text.slice(start, i), start, end: i });
      } else {
        fail(`an unexpected ${JSON.stringify(c)}`);
      }
    }
  }
  return tokens;
}

const relops = new Set(["=", "!=", "<", "<=", ">", ">=", "+=", "=+", ":=", "=:", "+=:", "=+="]);

export function parse(text: string, file: string): Item[] {
  const tokens = lex(text, file);
  let p = 0;
  const peek = () => tokens[p];
  const fail = (what: string): never => {
    throw new Error(`${file}: ${what}, at offset ${peek()?.start ?? text.length}`);
  };
  const is = (kind: Token["kind"], value?: string) =>
    peek()?.kind === kind && (value === undefined || peek().value === value);
  const expect = (kind: Token["kind"], value: string) => {
    if (!is(kind, value)) fail(`expected ${value}`);
    return tokens[p++];
  };

  const values = (close: string): Value[] => {
    const items: Value[] = [];
    while (!is("punct", close)) {
      if (p >= tokens.length) fail(`expected ${close}`);
      items.push(value());
    }
    p++;
    return items;
  };
  const atom = (): Value => {
    const t = tokens[p++];
    if (!t) return fail("a value is missing");
    if (t.kind === "string") return { kind: "string", value: t.value };
    if (t.kind === "ident") return { kind: "ident", value: t.value };
    if (t.kind === "punct" && t.value === "[") return { kind: "list", items: values("]") };
    if (t.kind === "punct" && t.value === "(") return { kind: "group", items: values(")") };
    p--;
    return fail("a value is missing");
  };
  const postfix = (): Value => {
    const base = atom();
    if (!is("punct", "{")) return base;
    const open = tokens[p++];
    values("}");
    const close = tokens[p - 1];
    return { kind: "option", value: base, filter: text.slice(open.end, close.start).trim() };
  };
  const unary = (): Value => {
    if (is("op", "!") || is("op", "?") || (peek()?.kind === "op" && relops.has(peek().value))) {
      const op = tokens[p++].value;
      return { kind: "prefix", op, value: unary() };
    }
    return postfix();
  };
  const relation = (): Value => {
    const left = unary();
    if (peek()?.kind === "op" && relops.has(peek().value)) {
      const op = tokens[p++].value;
      return { kind: "binary", op, left, right: unary() };
    }
    return left;
  };
  const conjunction = (): Value => {
    let left = relation();
    while (is("op", "&")) (p++, (left = { kind: "binary", op: "&", left, right: relation() }));
    return left;
  };
  const value = (): Value => {
    let left = conjunction();
    while (is("op", "|")) (p++, (left = { kind: "binary", op: "|", left, right: conjunction() }));
    return left;
  };

  const items = (close?: string): Item[] => {
    const found: Item[] = [];
    while (close ? !is("punct", close) : p < tokens.length) {
      const name = tokens[p++];
      if (!name || name.kind !== "ident") fail("expected a field or a section");
      if (is("punct", ":")) {
        p++;
        found.push({ kind: "field", name: name.value, value: value() });
      } else {
        if (is("string")) p++;
        expect("punct", "{");
        found.push({ kind: "section", name: name.value, items: items("}") });
      }
    }
    if (close) p++;
    return found;
  };
  return items();
}

export function field(items: Item[], name: string): Value | undefined {
  for (const item of items) if (item.kind === "field" && item.name === name) return item.value;
  return undefined;
}

export function section(items: Item[], name: string): Item[] | undefined {
  for (const item of items) if (item.kind === "section" && item.name === name) return item.items;
  return undefined;
}

export function text(value: Value | undefined): string | undefined {
  return value?.kind === "string" ? value.value : undefined;
}

// A field written as one string or as a list of them.
export function texts(value: Value | undefined): string[] {
  if (!value) return [];
  if (value.kind === "string") return [value.value];
  if (value.kind === "list") return value.items.flatMap((v) => (v.kind === "string" ? [v.value] : []));
  return [];
}

export type Dependency = { name: string; constraint?: string; alternative: boolean };

// `depends` and `depopts`: each package named, with its constraint as written.
// A name inside `|` is one of several that would do.
export function dependencies(value: Value | undefined): Dependency[] {
  const walk = (v: Value, alternative: boolean): Dependency[] => {
    switch (v.kind) {
      case "string":
        return [{ name: v.value, alternative }];
      case "option":
        return v.value.kind === "string" ? [{ name: v.value.value, constraint: v.filter, alternative }] : [];
      case "list":
      case "group":
        return v.items.flatMap((i) => walk(i, alternative));
      case "binary":
        return [...walk(v.left, alternative || v.op === "|"), ...walk(v.right, alternative || v.op === "|")];
      default:
        return [];
    }
  };
  return value ? walk(value, false) : [];
}
