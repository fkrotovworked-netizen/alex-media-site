// Downloads the case covers from the VK CDN once and keeps them as webp in public/cases/.
// The arguments of every `cover(...)` call in src/cases.ts are the source; the file name
// is the same one `cover()` returns, so the two never drift apart.
//   node scripts/fetch-covers.mjs          — only the missing ones
//   node scripts/fetch-covers.mjs --force  — all of them again
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = `${root}public/cases/`;
const force = process.argv.includes('--force');

const source = await readFile(`${root}src/cases.ts`, 'utf8');
const calls = [...source.matchAll(/cover\(\s*(\d+),\s*'([^']+)',\s*(\d+),\s*'([^']+)'\s*\)/g)];
await mkdir(out, { recursive: true });

let done = 0;
for (const [, host, id, quality, sizes] of calls) {
  const file = `${out}${id.slice(0, 16)}.webp`;
  if (!force && (await stat(file).catch(() => null))) continue;
  // the CDN nodes are mirrors, and some of them do not answer at all: try the next one
  let image = null;
  for (const node of [host, '6', '1', '20', '80', '42']) {
    const url = `https://sun9-${node}.vkuserphoto.ru/s/v1/ig2/${id}.jpg?quality=${quality}&as=${sizes}&from=bu&cs=1080x0`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) }).catch(() => null);
    if (response?.ok) {
      image = Buffer.from(await response.arrayBuffer());
      break;
    }
  }
  if (!image) throw new Error(`no node answered for ${id}`);
  // the preview is at most ~560 css px wide: 1080 covers a retina screen
  const webp = await sharp(image).resize({ width: 1080, withoutEnlargement: true }).webp({ quality: 80, effort: 6 }).toBuffer();
  await writeFile(file, webp);
  done++;
  console.log(`${id.slice(0, 16)}.webp  ${(image.length / 1024).toFixed(0)} → ${(webp.length / 1024).toFixed(0)} КБ`);
}
console.log(`${calls.length} covers, ${done} fetched`);
