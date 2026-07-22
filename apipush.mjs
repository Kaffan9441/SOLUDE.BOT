/**
 * Push a local working tree to GitHub WITHOUT git, via the Git Data REST API.
 * Only small JSON requests to api.github.com (plus one blob upload per changed
 * file) — no pack/bulk transfers, which some networks reset with ECONNRESET.
 * Handles a completely EMPTY repo (no branch yet) by bootstrapping the first commit.
 *
 * Usage:
 *   GITHUB_TOKEN='github_pat_xxx' DRY_RUN=1 node apipush.mjs   # preview
 *   GITHUB_TOKEN='github_pat_xxx' node apipush.mjs             # push
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const OWNER = process.env.GH_OWNER || "Kaffan9441";
const REPO = process.env.GH_REPO || "SOLUDE.BOT";
const BRANCH = process.env.GH_BRANCH || "main";
const SRC = process.env.SRC || "/Users/kaffan/Solude";
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;

const AUTHOR = {
  name: process.env.GIT_AUTHOR_NAME || "Affan Khan",
  email: process.env.GIT_AUTHOR_EMAIL || "affan@flightreadyai.com",
};
const MESSAGE = process.env.COMMIT_MESSAGE ||
  "SoluDe.bot marketing site: hero IK canvas, capabilities, agtech, process, contact + media";

const token = (process.env.GITHUB_TOKEN || "").trim();
if (!token) { console.error("GITHUB_TOKEN not set; aborting."); process.exit(1); }
if (!fs.existsSync(SRC)) { console.error(`SRC missing: ${SRC}`); process.exit(1); }

// Mirror .gitignore so we never upload junk.
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", ".claude", ".vercel", "coverage", "build", "out", "dist"]);
function skipFile(name) {
  return (
    name === ".DS_Store" ||
    name.startsWith(".env") ||
    name.endsWith(".pem") ||
    name.endsWith(".tsbuildinfo") ||
    /^(npm-debug|yarn-debug|yarn-error)\.log/.test(name)
  );
}

function listFiles(dir, base = "") {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) out.push(...listFiles(path.join(dir, entry.name), rel));
    } else if (!skipFile(entry.name)) {
      out.push(rel);
    }
  }
  return out;
}

function blobSha(buf) {
  return crypto.createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
}

async function gh(method, url, body, okStatuses = null) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      if (okStatuses && okStatuses.includes(res.status)) return { status: res.status, json: text ? JSON.parse(text) : null };
      if (!res.ok) throw new Error(`${method} ${url.replace(API, "")} -> ${res.status}: ${text.slice(0, 300)}`);
      return { status: res.status, json: text ? JSON.parse(text) : null };
    } catch (err) {
      if (attempt >= 4) throw err;
      console.log(`  retry ${attempt}: ${err.message.slice(0, 120)}`);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

// 1. Remote state — tolerate an empty repo (no branch yet)
let headSha = null, baseTreeSha = null;
const remote = new Map();
const refRes = await gh("GET", `${API}/git/ref/heads/${BRANCH}`, null, [200, 404, 409]);
if (refRes.status === 200) {
  headSha = refRes.json.object.sha;
  const headCommit = (await gh("GET", `${API}/git/commits/${headSha}`)).json;
  baseTreeSha = headCommit.tree.sha;
  const tree = (await gh("GET", `${API}/git/trees/${baseTreeSha}?recursive=1`)).json;
  if (tree.truncated) { console.error("Remote tree truncated; aborting."); process.exit(1); }
  for (const e of tree.tree) if (e.type === "blob") remote.set(e.path, e);
  console.log(`Target ${OWNER}/${REPO}@${BRANCH} — head ${headSha.slice(0, 8)}, ${remote.size} files.`);
} else {
  console.log(`Target ${OWNER}/${REPO}@${BRANCH} — EMPTY repo, will create the first commit.`);
}

// 2. Diff local vs remote
const changes = [], deletions = [], localPaths = new Set();
for (const rel of listFiles(SRC)) {
  localPaths.add(rel);
  const abs = path.join(SRC, rel);
  const buf = fs.readFileSync(abs);
  const mode = fs.statSync(abs).mode & 0o111 ? "100755" : "100644";
  const existing = remote.get(rel);
  if (!existing) { console.log(`added:    ${rel}`); changes.push({ path: rel, mode, buf }); }
  else if (existing.sha !== blobSha(buf) || existing.mode !== mode) { console.log(`modified: ${rel}`); changes.push({ path: rel, mode, buf }); }
}
for (const rel of remote.keys()) if (!localPaths.has(rel)) { console.log(`deleted:  ${rel}`); deletions.push(rel); }

if (!changes.length && !deletions.length) { console.log("Nothing to commit."); process.exit(0); }
if (process.env.DRY_RUN === "1") {
  console.log(`DRY RUN: ${changes.length} upload(s), ${deletions.length} deletion(s); no commit.`);
  process.exit(0);
}

// 3. Upload blobs sequentially
for (const c of changes) {
  c.sha = (await gh("POST", `${API}/git/blobs`, { content: c.buf.toString("base64"), encoding: "base64" })).json.sha;
  console.log(`uploaded: ${c.path} (${c.buf.length} bytes)`);
}

// 4. Tree -> commit -> ref (create ref if empty, else advance it)
const treeBody = {
  tree: [
    ...changes.map((c) => ({ path: c.path, mode: c.mode, type: "blob", sha: c.sha })),
    ...deletions.map((p) => ({ path: p, mode: "100644", type: "blob", sha: null })),
  ],
};
if (baseTreeSha) treeBody.base_tree = baseTreeSha;
const newTree = (await gh("POST", `${API}/git/trees`, treeBody)).json;

const commit = (await gh("POST", `${API}/git/commits`, {
  message: MESSAGE, tree: newTree.sha, parents: headSha ? [headSha] : [], author: AUTHOR, committer: AUTHOR,
})).json;
console.log(`Committed: ${commit.sha}`);

if (headSha) {
  const updated = (await gh("PATCH", `${API}/git/refs/heads/${BRANCH}`, { sha: commit.sha, force: false })).json;
  console.log(`Branch ${BRANCH} now at ${updated.object.sha}`);
} else {
  const created = (await gh("POST", `${API}/git/refs`, { ref: `refs/heads/${BRANCH}`, sha: commit.sha })).json;
  console.log(`Branch ${BRANCH} created at ${created.object.sha}`);
}
