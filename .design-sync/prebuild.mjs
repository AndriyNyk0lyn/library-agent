// Sync prebuild: compiles the Tailwind stylesheet and emits the .d.ts contracts.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const here = (p) => new URL(p, import.meta.url).pathname;

// 1. Tailwind: the app's globals.css plus the token-utility safelist.
const from = here("./tailwind.css");
const to = here("./pkg/app.css");
const result = await postcss([tailwind()]).process(readFileSync(from, "utf8"), { from, to });
writeFileSync(to, result.css);
console.log(`wrote ${to} (${result.css.length} bytes)`);

// 2. Declarations for pkg/index.ts. The converter's type reader has no path
// aliases, so "@/x" imports are rewritten to relative paths into types/src.
const types = here("./pkg/types");
rmSync(types, { recursive: true, force: true });
execFileSync("npx", ["tsc", "-p", here("./tsconfig.types.json")], { stdio: "inherit" });
const srcTypes = join(types, "src");
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith(".d.ts") ? [join(d, e.name)] : []);
for (const file of walk(types)) {
  const text = readFileSync(file, "utf8").replace(/(["'])@\/([^"']+)\1/g, (_, q, target) => {
    const rel = relative(dirname(file), join(srcTypes, target));
    return q + (rel.startsWith(".") ? rel : `./${rel}`) + q;
  });
  writeFileSync(file, text);
}
console.log(`wrote declarations to ${types}`);
