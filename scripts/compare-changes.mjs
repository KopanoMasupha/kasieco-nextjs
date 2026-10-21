import fs from "node:fs";
import path from "node:path";

const OUT = "C:/Users/LN991/Downloads/kasieco-nextjs/.spec-extract";
const REPO = "C:/Users/LN991/Downloads/kasieco-nextjs";

const only = process.argv[2];

const norm = (s) =>
  s
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n");

function diff(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push([" ", a[i]]);
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push(["-", a[i++]]);
    } else {
      out.push(["+", b[j++]]);
    }
  }
  while (i < n) out.push(["-", a[i++]]);
  while (j < m) out.push(["+", b[j++]]);
  return out;
}

const out = [];
const say = (s) => out.push(s);

for (const fn of fs.readdirSync(OUT)) {
  const m = fn.match(/^(\d+)_(FULL|PART)_(.+)\.txt$/);
  if (!m) continue;
  const [, line, kind, fileEncoded] = m;
  const target = fileEncoded.replace(/__/g, "/");
  if (only && !fn.includes(only)) continue;
  const repoPath = path.join(REPO, target);
  if (!fs.existsSync(repoPath)) {
    say(`\n===== [${kind}] ${target}  -- FILE MISSING IN REPO (spec line ${line})`);
    continue;
  }
  const spec = norm(fs.readFileSync(path.join(OUT, fn), "utf8"));
  const repo = norm(fs.readFileSync(repoPath, "utf8"));
  if (spec === repo) {
    say(`\n===== [${kind}] ${target}  -- IDENTICAL (spec line ${line})`);
    continue;
  }
  const d = diff(spec.split("\n"), repo.split("\n"));
  const changed = d.filter(([k]) => k !== " ").length;
  say(`\n===== [${kind}] ${target}  -- DIFFERS (spec line ${line}, ${changed} changed lines)`);
  for (const [k, l] of d) {
    if (k === " ") continue;
    say(`${k}${l}`);
  }
}

fs.writeFileSync(path.join(REPO, ".spec-diff.txt"), out.join("\n"), "utf8");
console.log("wrote .spec-diff.txt (" + out.length + " lines)");
