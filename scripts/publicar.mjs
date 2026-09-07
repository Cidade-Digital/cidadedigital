/**
 * Publica o build na branch `deploy` (usada pelo hPanel → GIT da Hostinger).
 *
 *   npm run publicar
 *
 * Fluxo:
 *  1. npm run build            -> gera dist/
 *  2. git worktree em ./deploy -> aponta para a branch órfã `deploy`
 *  3. substitui o conteúdo por dist/ (mantém .git)
 *  4. commit + push da branch deploy
 *
 * No hPanel: GIT → repositório, branch `deploy`, diretório `public_html`.
 */
import { execSync } from 'node:child_process';
import { existsSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const sh = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });
const shOut = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

const DEPLOY_DIR = 'deploy';
const BRANCH = 'deploy';

// 1. build
sh('npm run build');

// 2. garante a branch órfã e o worktree
const temBranch = (() => {
  try {
    shOut(`git show-ref --verify refs/heads/${BRANCH}`);
    return true;
  } catch {
    return false;
  }
})();

if (!existsSync(DEPLOY_DIR)) {
  if (temBranch) {
    sh(`git worktree add ${DEPLOY_DIR} ${BRANCH}`);
  } else {
    sh(`git worktree add --detach ${DEPLOY_DIR}`);
    sh(`git -C ${DEPLOY_DIR} checkout --orphan ${BRANCH}`);
    sh(`git -C ${DEPLOY_DIR} reset --hard`);
  }
}

// 3. limpa (menos .git) e copia dist/
for (const nome of readdirSync(DEPLOY_DIR)) {
  if (nome === '.git') continue;
  rmSync(join(DEPLOY_DIR, nome), { recursive: true, force: true });
}
cpSync('dist', DEPLOY_DIR, { recursive: true });

// 4. commit + push
sh('git add -A', { cwd: DEPLOY_DIR });
const limpo = shOut(`git -C ${DEPLOY_DIR} status --porcelain`) === '';
if (limpo) {
  console.log('Nada mudou desde o último deploy.');
  process.exit(0);
}
const rev = shOut('git rev-parse --short HEAD');
sh(`git commit -m "deploy: build de ${rev}"`, { cwd: DEPLOY_DIR });

try {
  sh(`git push origin ${BRANCH}`, { cwd: DEPLOY_DIR });
} catch {
  console.log(`\nBranch "${BRANCH}" pronta localmente. Configure o remoto e rode:`);
  console.log(`  git push -u origin ${BRANCH}`);
}
