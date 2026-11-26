// The build for Beget (alexmediaagency.ru): the site at the root, the forms posting to /send.php,
// the PHP receiver beside index.html, and everything packed into alexmediaagency-site.zip —
// upload its contents into public_html (the file manager can unpack it there).
import { execSync } from 'node:child_process';
import { copyFileSync, rmSync } from 'node:fs';

const run = (cmd, env = {}) => execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });

rmSync('dist', { recursive: true, force: true });
rmSync('alexmediaagency-site.zip', { force: true });
run('npm run build', { BASE_PATH: '/', VITE_LEAD_ENDPOINT: '/send.php' });
copyFileSync('server/send.php', 'dist/send.php');
run('cd dist && zip -qr ../alexmediaagency-site.zip . -x ".DS_Store" "*/.DS_Store"');
console.log('\nready: alexmediaagency-site.zip → public_html on Beget');
