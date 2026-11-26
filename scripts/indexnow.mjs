// Tells Yandex (and Bing) through IndexNow that the site's pages changed, so the robot comes sooner.
// Run after every upload to Beget: `npm run indexnow`. The key file public/<KEY>.txt must already be live.
const SITE = 'https://alexmediaagency.ru/';
const KEY = '349f1d9accad3948c18e599af16a857d';
const urls = [SITE];

const live = await fetch(`${SITE}${KEY}.txt`).then((r) => (r.ok ? r.text() : ''), () => '');
if (live.trim() !== KEY) {
  console.error(`the key file ${SITE}${KEY}.txt is not on the site yet — upload the build first`);
  process.exit(1);
}

for (const endpoint of ['https://yandex.com/indexnow', 'https://api.indexnow.org/indexnow']) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}${KEY}.txt`, urlList: urls })
  });
  console.log(`${endpoint}: ${res.status} ${res.status < 300 ? 'принято' : await res.text()}`);
}
