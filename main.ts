// Night Vault — the hand-in program (Node 22, standard library only).
// It gathers the game and its screenshots from beside this file and
// writes them to /output, plus the dossier the judge reads, built by
// the kit's vendored library. Outside the grader, MAKEFUN_OUTPUT_DIR
// stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(outputDir, 'game');
const shotsDir = join(outputDir, 'screenshots');

// The output directory may be a grader mount point: clear only what
// is inside it, never the directory itself.
for (const entry of ['game', 'screenshots', 'dossier.json']) {
  const target = join(outputDir, entry);
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
}
mkdirSync(gameDir, { recursive: true });
mkdirSync(shotsDir, { recursive: true });

cpSync(join(repoRoot, 'game'), gameDir, { recursive: true });
const repoShots = join(repoRoot, 'screenshots');
if (existsSync(repoShots)) {
  cpSync(repoShots, shotsDir, { recursive: true });
}

// The gate's own caps, from the competition's rules: the dossier text
// holds at most 160 KiB of source, at most 4 screenshots of 256 KiB
// each, and game/ stays under 993 files and 48 MiB.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`Night Vault handed in to ${outputDir}`);
