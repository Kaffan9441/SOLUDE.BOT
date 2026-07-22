// Push /Users/kaffan/Solude to GitHub without a local git binary.
// Token is read from stdin so it never touches disk:
//   printf '%s' "$TOKEN" | node gitpush.mjs
import fs from 'node:fs';
import path from 'node:path';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

const dir = '/Users/kaffan/Solude';
const remoteUrl = 'https://github.com/Kaffan9441/SOLUDE.BOT.git';
const author = { name: 'Affan Khan', email: 'affan@flightreadyai.com' };

const token = fs.readFileSync(0, 'utf8').trim();
if (!token) { console.error('no token on stdin'); process.exit(1); }

const SKIP = new Set(['.git', 'node_modules', '.DS_Store', '.vercel']);

function listFiles(base, rel = '') {
  const out = [];
  for (const entry of fs.readdirSync(path.join(base, rel), { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const p = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(base, p));
    else out.push(p);
  }
  return out;
}

await git.init({ fs, dir, defaultBranch: 'main' });

const files = listFiles(dir);
for (const filepath of files) {
  await git.add({ fs, dir, filepath });
}
console.log(`staged ${files.length} files`);

const status = await git.statusMatrix({ fs, dir });
const dirty = status.some(([, head, workdir, stage]) => !(head === 1 && workdir === 1 && stage === 1));
let head = null;
try { head = await git.resolveRef({ fs, dir, ref: 'HEAD' }); } catch {}

if (!head || dirty) {
  const sha = await git.commit({
    fs, dir, author,
    message: 'SoluDe.bot marketing site: hero IK canvas, capabilities, agtech, process, contact + media',
  });
  console.log('commit', sha);
} else {
  console.log('nothing new to commit, pushing existing HEAD', head);
}

const res = await git.push({
  fs, http, dir,
  url: remoteUrl,
  ref: 'main',
  remoteRef: 'main',
  onAuth: () => ({ username: 'x-access-token', password: token }),
});
console.log('push ok:', JSON.stringify(res));
