// Search and sharing: everything a robot reads before (or without) running the page's JS.
//   <head>   canonical, robots, Open Graph / VK / Telegram preview, icons, manifest, JSON-LD
//   #root    the page's text as plain HTML (h1, services, prices, process, FAQ, contacts) — React replaces
//            it on mount; for a reader without JS it fades in after 2 s, so it is never hidden text
//   files    robots.txt and sitemap.xml (lastmod = build day)
// Texts come from src/content.ts, so the markup never drifts from the page.
// The GitHub Pages copy (base ≠ '/') is a mirror: noindex, canonical to the real domain, no robots/sitemap.
import type { Plugin } from 'vite';
import { content } from '../src/content';

export const SITE = 'https://alexmediaagency.ru/';

const TITLE = 'Агентство лидогенерации Alex Media — Яндекс Директ, таргет ВК, сайты, AI';
const DESCRIPTION =
  'Заявки из Яндекс Директа и таргета ВКонтакте, сайты и воронки, CRM и AI-автоматизация под ключ. Агентство Александра Гирина, в маркетинге с 2017 года.';
const OG_TITLE = 'Alex Media — агентство лидогенерации';
const OG_DESCRIPTION = 'Яндекс Директ, таргет ВКонтакте, сайты, CRM и AI — в одной системе. Считаем заявки и продажи, а не клики.';
const OG_IMAGE = { path: 'og.jpg', width: 1200, height: 630, alt: 'Alex Media — агентство лидогенерации Александра Гирина' };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nb = (s: string) => s.replace(/ |‑/g, (c) => (c === '‑' ? '-' : ' '));
const text = (s: string) => esc(nb(s));
const join = (lines: readonly string[]) => lines.map(nb).join(' ');
const num = (price: string) => (/^[\d\s]+$/.test(price) ? Number(price.replace(/\s/g, '')) : null);

type Answer = readonly (string | readonly string[])[];
const answerText = (a: Answer) => a.map((p) => (typeof p === 'string' ? nb(p) : p.map(nb).join(' '))).join(' ');
const answerHtml = (a: Answer) =>
  a.map((p) => (typeof p === 'string' ? `<p>${text(p)}</p>` : `<ul>${p.map((li) => `<li>${text(li)}</li>`).join('')}</ul>`)).join('');

function jsonLd() {
  const abs = (p: string) => SITE + p;
  const org = {
    '@type': 'Organization',
    '@id': SITE + '#org',
    name: content.brand,
    url: SITE,
    logo: abs('icon-512.png'),
    image: abs(OG_IMAGE.path),
    description: nb(content.footer.about),
    legalName: 'ИП Гирин Александр Викторович',
    taxID: '561102939234',
    areaServed: { '@type': 'Country', name: 'Россия' },
    knowsLanguage: 'ru',
    founder: {
      '@type': 'Person',
      name: content.hero.photo.name,
      jobTitle: 'Основатель Alex Media',
      image: abs(content.hero.photo.src),
      sameAs: [content.telegram, 'https://vk.com/alex13girin']
    },
    sameAs: content.footer.contacts.map((c) => c.href),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: nb(content.prices.label),
      itemListElement: content.prices.items.map((item) => {
        const price = num(item.price);
        return {
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: nb(item.name), description: nb(item.text), provider: { '@id': SITE + '#org' } },
          ...(price !== null && {
            priceSpecification: {
              '@type': 'PriceSpecification',
              minPrice: price,
              priceCurrency: 'RUB',
              ...(item.per.includes('мес') && { unitText: 'месяц' })
            }
          })
        };
      })
    }
  };
  const site = { '@type': 'WebSite', '@id': SITE + '#site', name: content.brand, url: SITE, inLanguage: 'ru-RU', publisher: { '@id': SITE + '#org' } };
  const faq = {
    '@type': 'FAQPage',
    mainEntity: content.faq.items.map((item) => ({
      '@type': 'Question',
      name: nb(item.q),
      acceptedAnswer: { '@type': 'Answer', text: answerText(item.a) }
    }))
  };
  // `<` escaped so no string can close the script tag
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': [org, site, faq] }).replace(/</g, '\\u003c');
}

function staticPage() {
  const c = content;
  const services = [c.services.main, ...c.services.items]
    .map((s) => `<li><h3>${text(s.title)}</h3><p>${text(s.text)}</p></li>`)
    .join('');
  const prices = c.prices.items
    .map((p) => `<li><h3>${text(p.name)}</h3><p>${num(p.price) === null ? text(p.price) : `${c.prices.from} ${text(p.price)} ${text(p.per)}`}. ${text(p.text)}</p></li>`)
    .join('');
  const stages = c.process.stages.map((s) => `<li><h3>${text(s.name)}</h3><p>${text(s.text)}</p></li>`).join('');
  const reasons = c.about.reasons.map((r) => `<li><h3>${text(r.title)}</h3><p>${text(r.text)}</p></li>`).join('');
  const faq = c.faq.items.map((f) => `<details><summary>${text(f.q)}</summary>${answerHtml(f.a)}</details>`).join('');
  const contacts = c.footer.contacts.map((k) => `<li>${text(k.label)}: <a href="${esc(k.href)}">${text(k.value)}</a></li>`).join('');
  return `<div class="seo-static">
<header><p>${text(c.hero.eyebrow)}</p><h1>${text(join(c.hero.title))} ${text(c.brand)}</h1><p>${text(c.hero.lead)}</p>
<ul>${c.hero.scope.map((s) => `<li>${text(s)}</li>`).join('')}</ul>
<p><a href="#contact">${text(c.hero.primary.label)}</a> · <a href="${esc(c.telegram)}">Telegram</a></p></header>
<section id="services"><h2>${text(join(c.services.title))}</h2><p>${text(c.services.lead)}</p><ul>${services}</ul></section>
<section id="ai"><h2>${text(join(c.ai.title))}</h2><p>${text(c.ai.lead)}</p></section>
<section id="process"><h2>${text(join(c.process.title))}</h2><ol>${stages}</ol></section>
<section id="about"><h2>${text(join(c.about.title))}</h2><ul>${reasons}</ul><blockquote>${text(c.about.quote.text)} — ${text(c.hero.photo.name)}</blockquote></section>
<section id="prices"><h2>${text(c.prices.label)}</h2><ul>${prices}</ul><p>${text(c.prices.budget)}</p></section>
<section id="faq"><h2>${text(join(c.faq.title))}</h2>${faq}</section>
<footer id="contact"><p>${text(c.footer.about)}</p><ul>${contacts}</ul><p>${text(c.footer.requisites)}</p>
<p>${c.footer.legal.map((l) => `<a href="${esc(l.href)}">${text(l.label)}</a>`).join(' · ')}</p></footer>
</div>`;
}

const STATIC_STYLE = `<style>
.seo-static{max-width:46rem;margin:0 auto;padding:6rem 1.25rem;color:#cfd1cc;font:1rem/1.55 system-ui,sans-serif;opacity:0;animation:seo-static-in .3s 2s forwards}
.seo-static a{color:#c1e507}.seo-static h1{font-size:2rem;line-height:1.15;color:#f2f3ee}.seo-static h2{margin-top:3rem;color:#f2f3ee}.seo-static h3{margin:1rem 0 .25rem;font-size:1.05rem}
@keyframes seo-static-in{to{opacity:1}}
</style>`;

export function seo(): Plugin {
  let base = '/';
  return {
    name: 'alex-media-seo',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const mirror = base !== '/';
        const head = [
          `<title>${esc(TITLE)}</title>`,
          `<meta name="description" content="${esc(DESCRIPTION)}" />`,
          `<meta name="robots" content="${mirror ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1'}" />`,
          `<link rel="canonical" href="${SITE}" />`,
          `<meta name="author" content="${esc(content.hero.photo.name)}" />`,
          `<meta property="og:type" content="website" />`,
          `<meta property="og:locale" content="ru_RU" />`,
          `<meta property="og:site_name" content="${esc(content.brand)}" />`,
          `<meta property="og:url" content="${SITE}" />`,
          `<meta property="og:title" content="${esc(OG_TITLE)}" />`,
          `<meta property="og:description" content="${esc(OG_DESCRIPTION)}" />`,
          `<meta property="og:image" content="${SITE + OG_IMAGE.path}" />`,
          `<meta property="og:image:width" content="${OG_IMAGE.width}" />`,
          `<meta property="og:image:height" content="${OG_IMAGE.height}" />`,
          `<meta property="og:image:alt" content="${esc(OG_IMAGE.alt)}" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
          `<link rel="icon" href="${base}favicon.ico" sizes="32x32" />`,
          `<link rel="icon" href="${base}icon-192.png" type="image/png" sizes="192x192" />`,
          `<link rel="apple-touch-icon" href="${base}apple-touch-icon.png" />`,
          `<link rel="manifest" href="${base}site.webmanifest" />`,
          `<script type="application/ld+json">${jsonLd()}</script>`,
          STATIC_STYLE
        ].join('\n    ');
        return html
          .replace(/<!--seo-->/, head)
          .replace('<div id="root"></div>', `<div id="root">${staticPage()}</div>`);
      }
    },
    generateBundle() {
      if (base !== '/') return;
      const day = new Date().toISOString().slice(0, 10);
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nDisallow: /send.php\n\nSitemap: ${SITE}sitemap.xml\n`
      });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}</loc><lastmod>${day}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>
`
      });
    }
  };
}
