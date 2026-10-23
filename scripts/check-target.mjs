import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = JSON.parse(fs.readFileSync(path.join(root, '.blueprint-project.json'), 'utf8'));
const normalize = value => value.trim().replace(/^git@github.com:/, '').replace(/^https:\/\/github.com\//, '').replace(/\.git$/, '').toLowerCase();
const expected = target.repository.toLowerCase();
const deployedRepository = process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
  ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`.toLowerCase() : null;

if (deployedRepository && deployedRepository !== expected) {
  throw new Error(`Wrong deployment source: ${deployedRepository}. Expected ${target.repository}.`);
}
if (fs.existsSync(path.join(root, '.git'))) {
  const bundled = '/Applications/GitHub Desktop.app/Contents/Resources/app/git';
  const hasBundled = fs.existsSync(`${bundled}/bin/git`);
  const origin = execFileSync(hasBundled ? `${bundled}/bin/git` : 'git', ['remote', 'get-url', 'origin'], {
    cwd: root, encoding: 'utf8',
    env: hasBundled ? { ...process.env, GIT_EXEC_PATH: `${bundled}/libexec/git-core` } : process.env,
  });
  if (normalize(origin) !== expected) throw new Error(`Wrong checkout: ${normalize(origin)}. Expected ${target.repository}.`);
  console.log(`Verified source: ${target.repository} → ${target.vercelProject} (${target.domain}).`);
} else if (deployedRepository) {
  console.log(`Verified Vercel Git source: ${target.repository}.`);
} else {
  throw new Error('Cannot verify deployment source: missing Git checkout and Vercel Git identity. Build from the connected repository.');
}
