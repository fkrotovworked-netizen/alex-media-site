// Adds components from the official React Bits registry (https://reactbits.dev/r),
// the same source the shadcn and jsrepo CLIs read. TS + CSS variant.
//
//   npm run bits -- ShinyText GlassSurface        install
//   npm run bits -- --check SpecularButton        print dependencies only
//
// Dependencies are printed, never installed: each one is a decision, since the
// project keeps a single animation library.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const names = args.filter((a) => !a.startsWith('--'));

for (const name of names) {
  const res = await fetch(`https://reactbits.dev/r/${name}-TS-CSS.json`);
  if (!res.ok) {
    console.error(`${name}: registry answered ${res.status}`);
    process.exitCode = 1;
    continue;
  }
  const item = await res.json();
  const deps = item.dependencies?.length ? item.dependencies.join(', ') : 'none';
  console.log(`${name}: dependencies ${deps}`);
  if (checkOnly) continue;

  const dir = path.join(root, 'src', 'components', 'reactbits', name);
  await mkdir(dir, { recursive: true });
  for (const file of item.files) {
    const target = path.join(dir, path.basename(file.path));
    await writeFile(target, file.content);
    console.log(`  ${path.relative(root, target)}`);
  }
}
