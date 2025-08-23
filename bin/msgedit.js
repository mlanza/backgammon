// git-gpage.js
// Keys: ↑/↓ move • Enter preview • s print SHA • m edit message • Esc/q quit
// Diff colors: adds=lime green, subtracts=brown, context=light gray

// --- unified context parsing (git-compatible) ---
let contextLines = 3; // default like git
function tryParseInt(s) {
  const n = parseInt(String(s), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
for (let i = 0; i < Deno.args.length; i++) {
  const a = Deno.args[i];
  if (a === "-U" || a === "--unified") {
    const n = tryParseInt(Deno.args[i + 1]);
    if (n !== null) { contextLines = n; i++; }
    continue;
  }
  if (a.startsWith("-U") && a.length > 2) {
    const n = tryParseInt(a.slice(2));
    if (n !== null) contextLines = n;
    continue;
  }
  if (a.startsWith("--unified=")) {
    const n = tryParseInt(a.split("=", 2)[1]);
    if (n !== null) contextLines = n;
    continue;
  }
}

const pageSize = 20;
const COLOR = {
  reset: "\x1b[90m",
  adds: "\x1b[38;5;29m",
  subtracts: "\x1b[38;5;94m",
  context: "\x1b[0m",
};

const esc = (s) => new TextEncoder().encode(s);
const write = (s) => Deno.stdout.write(esc(s));

const CSI = {
  altOn: "\x1b[?1049h",
  altOff: "\x1b[?1049l",
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
  home: "\x1b[H",
  clearEos: "\x1b[0J",
  clearEol: "\x1b[2K",
};

function termRows() {
  try { return Math.max(8, Deno.consoleSize().rows); }
  catch { return 24; }
}

async function runGit(args, opts = {}) {
  const p = new Deno.Command("git", { args, stdout: "piped", stderr: "piped", ...opts }).spawn();
  const { code, stdout, stderr } = await p.output();
  if (code !== 0) throw new Error(new TextDecoder().decode(stderr));
  return new TextDecoder().decode(stdout);
}

function parseCommits(text) {
  return text.trim().split("\n").filter(Boolean).map((line) => {
    const [sha, date, subject, author] = line.split("\t");
    return { sha, date, subject, author };
  });
}

function colorizeDiffLine(line) {
  if (line.startsWith("+++ ") || line.startsWith("--- ") || line.startsWith("@@")) return line;
  if (line.startsWith("+")) return COLOR.adds + line + COLOR.reset;
  if (line.startsWith("-")) return COLOR.subtracts + line + COLOR.reset;
  if (line.startsWith(" ")) return COLOR.context + line + COLOR.reset;
  return line;
}

async function readKey() {
  const buf = new Uint8Array(8);
  await Deno.stdin.read(buf);
  const s = new TextDecoder().decode(buf).replace(/\0+$/g, "");
  if (s === "\x1b") return "escape";        // Esc
  if (s === "\r" || s === "\n") return "enter";
  if (s === "s") return "sha";
  if (s === "m") return "m";
  if (s === "p") return "p";                // alias: preview
  if (s === "q") return "escape";           // q also quits
  if (s === "\x1b[A" || s === "k") return "up";
  if (s === "\x1b[B" || s === "j") return "down";
  if (s === "\x1b[6~" || s === " ") return "pagedown";
  if (s === "\x1b[5~" || s === "b") return "pageup";
  if (s === "g") return "home";
  if (s === "G") return "end";
  return s;
}

async function drawHeader(text) {
  await write(CSI.home + CSI.clearEos);
  await write(text + "\n");
}

async function drawList(commits, idx, offset) {
  const rows = termRows();
  await drawHeader("↑/↓ move • Enter preview • s print SHA • m edit message • Esc/q quit\n");
  const visible = commits.slice(offset, offset + pageSize);
  for (let i = 0; i < visible.length; i++) {
    const c = visible[i];
    const cur = offset + i === idx ? "❯" : " ";
    await write(CSI.clearEol + `${cur} ${c.sha}  ${c.date}  ${c.subject}  [${c.author}]\n`);
  }
  const used = 2 + visible.length;
  for (let i = used; i < rows; i++) await write(CSI.clearEol + "\n");
  if (commits.length > offset + pageSize) {
    await write("\x1b[1A" + CSI.clearEol + `… (${commits.length - (offset + pageSize)} more)\n`);
  }
}

/* ---------- Bracketization helpers ---------- */

function parseHunkHeader(line) {
  const m = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
  if (!m) return null;
  const oldStart = parseInt(m[1], 10);
  const oldLen = m[2] ? parseInt(m[2], 10) : 1;
  const newStart = parseInt(m[3], 10);
  const newLen = m[4] ? parseInt(m[4], 10) : 1;
  return { oldStart, oldLen, newStart, newLen };
}

function stripBPrefix(bPath) {
  if (bPath.startsWith("b/")) return bPath.slice(2);
  return bPath;
}

function countLines(s) {
  if (s.length === 0) return 0;
  const n = (s.match(/\n/g) || []).length;
  return s.endsWith("\n") ? n : n + 1;
}

function padBracketLine(prefix, text) {
  return `${prefix} ${text}`;
}

async function getBlobAtCommit(sha, path, cache) {
  if (cache.has(path)) return cache.get(path);
  try {
    const blob = await runGit(["show", `${sha}:${path}`]);
    cache.set(path, blob);
    return blob;
  } catch {
    cache.set(path, null);
    return null;
  }
}

async function bracketizePatch(sha, raw) {
  const out = [];
  const lines = raw.split("\n");
  let bPath = null;
  let bFilePath = null;
  let totalNewLines = null;
  const blobCache = new Map();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("diff --git ")) {
      bPath = null;
      bFilePath = null;
      totalNewLines = null;
      out.push(line);
      continue;
    }

    if (line.startsWith("Binary files ") || line.startsWith("GIT binary patch")) {
      out.push(line);
      continue;
    }

    if (line.startsWith("+++ ")) {
      bPath = line.slice(4).trim();
      bFilePath = bPath === "/dev/null" ? null : stripBPrefix(bPath);
      out.push(line);
      continue;
    }

    if (line.startsWith("--- ")) {
      out.push(line);
      continue;
    }

    if (line.startsWith("@@")) {
      const meta = parseHunkHeader(line);
      out.push(line);
      if (!meta) continue;

      if (bFilePath === null) {
        totalNewLines = 0;
      } else {
        if (totalNewLines == null) {
          const blob = await getBlobAtCommit(sha, bFilePath, blobCache);
          totalNewLines = blob == null ? 0 : countLines(blob);
        }
      }

      const topOmitted = Math.max(0, (meta.newStart || 1) - 1);
      if (topOmitted > 0) out.push(padBracketLine("⎡", `… ${topOmitted} lines`));

      let j = i + 1;
      const body = [];
      for (; j < lines.length; j++) {
        const ln = lines[j];
        if (ln.startsWith("diff --git ") || ln.startsWith("@@ ") || ln.startsWith("Binary files ") || ln.startsWith("GIT binary patch") || ln.startsWith("index ")) break;
        if (ln.startsWith("--- ") || ln.startsWith("+++ ")) break;
        body.push(ln);
      }

      for (const b of body) {
        out.push(padBracketLine("⎢", colorizeDiffLine(b)));
      }

      const hunkEnd = (meta.newStart || 1) + (meta.newLen || 1) - 1;
      const bottomOmitted = Math.max(0, (totalNewLines ?? 0) - hunkEnd);
      if (bottomOmitted > 0) out.push(padBracketLine("⎣", `… ${bottomOmitted} lines`));

      i = j - 1;
      continue;
    }

    out.push(line);
  }

  return out;
}

/* ---------- Preview (now with brackets) ---------- */

async function preview(sha) {
  const raw = await runGit([
    "show", "--stat", "--patch", "--color=never", `-U${contextLines}`, sha,
  ]);
  const bracketed = await bracketizePatch(sha, raw);
  const lines = bracketed;
  const height = Math.max(5, termRows() - 2);

  let start = 0;
  const clamp = () => { start = Math.max(0, Math.min(start, Math.max(0, lines.length - height))); };

  for (;;) {
    await drawHeader(`[${sha}]  (↑/k ↓/j line • PgUp/b PgDn/Space page • g top • G bottom • any key to return)\n`);
    for (let i = 0; i < height; i++) {
      const line = lines[start + i] ?? "";
      const toPrint = (line.startsWith("⎡") || line.startsWith("⎢") || line.startsWith("⎣"))
        ? line
        : colorizeDiffLine(line);
      await write(CSI.clearEol + toPrint + "\n");
    }
    const key = await readKey();
    if (key === "up")            { start -= 1; clamp(); }
    else if (key === "down")     { start += 1; clamp(); }
    else if (key === "pageup")   { start -= height; clamp(); }
    else if (key === "pagedown") { start += height; clamp(); }
    else if (key === "home")     { start = 0; }
    else if (key === "end")      { start = Math.max(0, lines.length - height); }
    else break;
  }
}

async function getFullMessage(sha) {
  return (await runGit(["log", "-1", "--pretty=%B", sha])).trimEnd();
}

async function sequenceEditorScript(tempDir, sha) {
  const code = `
// edits interactive rebase todo: "pick <sha>" -> "reword <sha>"
const sha = Deno.env.get("TARGET_SHA");
const todo = Deno.args[0];
const text = await Deno.readTextFile(todo);
const lines = text.split("\\n");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith("pick " + sha)) {
    lines[i] = lines[i].replace(/^pick\\s+/, "reword ");
    break;
  }
}
await Deno.writeTextFile(todo, lines.join("\\n"));
`;
  const path = `${tempDir}/seqedit-${crypto.randomUUID()}.js`;
  await Deno.writeTextFile(path, code);
  return path;
}

async function messageEditorScript(tempDir, newMsg) {
  const escb = newMsg.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
  const code = `
const msgPath = Deno.args[0];
await Deno.writeTextFile(msgPath, \`${escb}\\n\`);
`;
  const path = `${tempDir}/msgedit-${crypto.randomUUID()}.js`;
  await Deno.writeTextFile(path, code);
  return path;
}

async function rewordNonInteractive(sha, newMessage) {
  const tempDir = await Deno.makeTempDir();
  const seqPath = await sequenceEditorScript(tempDir, sha);
  const msgPath = await messageEditorScript(tempDir, newMessage);
  const denoExe = Deno.execPath();
  const env = {
    "GIT_SEQUENCE_EDITOR": `"${denoExe}" run -A "${seqPath}"`,
    "GIT_EDITOR": `"${denoExe}" run -A "${msgPath}"`,
    "TARGET_SHA": sha,
  };
  try {
    await runGit(["rebase", "-i", `${sha}^`], { env });
  } finally {
    try {
      await Deno.remove(seqPath);
      await Deno.remove(msgPath);
      await Deno.remove(tempDir, { recursive: true });
    } catch {}
  }
}

async function promptLine(question, initial = "") {
  const isTTY = Deno.isatty(Deno.stdin.rid);
  if (isTTY) await Deno.stdin.setRaw(false);
  try {
    const suffix = initial ? `\nCurrent: ${initial.trim()}\nNew: ` : "\nNew: ";
    const answer = prompt(`${question}${suffix}`) ?? "";
    return answer.trim();
  } finally {
    if (isTTY) await Deno.stdin.setRaw(true, true);
  }
}

async function main() {
  const fmt = "%h%x09%ad%x09%s%x09%an";
  const raw = await runGit(["log", "--date=short", `--pretty=format:${fmt}`]);
  const commits = parseCommits(raw);
  if (!commits.length) { console.error("No commits."); Deno.exit(1); }

  const isTTY = Deno.isatty(Deno.stdin.rid);

  await write(CSI.altOn + CSI.hideCursor);
  try {
    if (isTTY) await Deno.stdin.setRaw(true, true);

    let idx = 0, offset = 0;
    await drawList(commits, idx, offset);

    for (;;) {
      const key = await readKey();
      if (key === "escape") break;

      if (key === "up") {
        idx = Math.max(0, idx - 1);
        if (idx < offset) offset = idx;
      } else if (key === "down") {
        idx = Math.min(commits.length - 1, idx + 1);
        if (idx >= offset + pageSize) offset = idx - pageSize + 1;
      } else if (key === "enter" || key === "p") {
        await preview(commits[idx].sha);
      } else if (key === "sha") {
        await write(CSI.altOff + CSI.showCursor);
        if (isTTY) await Deno.stdin.setRaw(false);
        console.log(commits[idx].sha);
        return;
      } else if (key === "m") {
        const sha = commits[idx].sha;
        const existing = await getFullMessage(sha);
        const subject = existing.split("\n")[0] || commits[idx].subject;
        const newMsg = await promptLine(`Edit message for ${sha}`, subject);
        if (newMsg) {
          try {
            await rewordNonInteractive(sha, newMsg);
            const raw2 = await runGit(["log", "--date=short", `--pretty=format:${fmt}`]);
            const updated = parseCommits(raw2);
            idx = Math.min(idx, updated.length - 1);
            offset = Math.max(0, Math.min(offset, updated.length - pageSize));
            commits.splice(0, commits.length, ...updated);
            await drawHeader(`Reworded ${sha}. If already pushed: git push --force-with-lease\n`);
          } catch (e) {
            await drawHeader(`Reword failed: ${(e && e.message) || e}\nPress any key to continue…\n`);
            await readKey();
          }
        }
      }

      await drawList(commits, idx, offset);
    }

    if (isTTY) await Deno.stdin.setRaw(false);
  } finally {
    await write(CSI.showCursor + CSI.altOff);
  }
}
await main();
