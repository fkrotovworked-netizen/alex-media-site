// The agency's published cases. Every figure is taken from the case article it links to
// (vk.ru/@alexgirin_blog) — nothing here is estimated or rounded up.
//
// Covers are the articles' own cover images. The arguments of `cover()` describe the
// original on the VK CDN; `npm run covers` fetches it once into public/cases/ as webp,
// and the site serves only the local copy (the CDN was slow and some nodes never answered).

import { asset } from './asset';

export interface CaseStudy {
  /** Short name, as it stands on the wheel. */
  name: string;
  niche: string;
  city?: string;
  channel: string;
  /** The one figure the case is remembered by. */
  value: string;
  unit: string;
  /** Where it started, or what else was achieved. */
  note: string;
  /** Set for the case that did not work out — it is shown as honestly as the rest. */
  anti?: boolean;
  href: string;
  cover: string;
  /** Cover width / height. */
  ratio: number;
}

const article = (slug: string) => `https://vk.ru/@alexgirin_blog-${slug}`;
const cover = (_host: number, id: string, _quality: number, _sizes: string) => asset(`cases/${id.slice(0, 16)}.webp`);

const published: CaseStudy[] = [
  {
    name: 'Balcon',
    niche: 'Бар',
    city: 'Санкт-Петербург',
    channel: 'Яндекс Директ',
    value: '987',
    unit: 'заявок за месяц по 80 ₽',
    note: 'Начинали с 14 заявок по 1 634 ₽.',
    href: article('keis-lidogeneraciya-1000-zayavok-v-mesyac-po-80-prodvizhenie'),
    cover: cover(
      6,
      'AJ57d7TEJ5Hq_gX_sD1vOiJA0NZY-DKj7bSGI3cihabrViXO6lvRwW368ctkCLTALQK9rahC1Lw2awZO8DQxewzR',
      95,
      '32x17,48x26,72x39,108x58,160x87,240x130,360x195,480x260,540x292,640x346,720x390,1080x585,1280x693,1440x780,2560x1386'
    ),
    ratio: 2560 / 1386
  },
  {
    name: 'City Beach Club',
    niche: 'Пляжный комплекс',
    channel: 'Яндекс Директ',
    value: '913',
    unit: 'целевых конверсий за месяц по ~193 ₽',
    note: 'Начинали с 16 лидов по 1 869 ₽.',
    href: article('keis-kak-prodvigat-plyazhno-razvlekatelnyi-kompleks-kogda-po'),
    cover: cover(
      18,
      'W94mqylxjgmjsG9rGOGmyP4_g3NYgaMqiDTSIwizXOhDgMHIa0E9JUafTh-psp4fbkngR4wObhrFm_O0rJMSEw75',
      95,
      '32x18,48x27,72x41,108x61,160x90,240x135,360x203,480x270,540x304,640x360,720x405,1080x608,1280x720,1440x810,1672x941'
    ),
    ratio: 1672 / 941
  },
  {
    name: 'Океан',
    niche: 'Ресторан',
    city: 'Калининград',
    channel: 'Запуск: соцсети, посевы, чат-бот',
    value: '7 500',
    unit: 'заявок в базе за два месяца',
    note: 'Sold out на две недели вперёд к открытию.',
    href: article('keis-zapusk-restorana-okean-v-kaliningrade-ili-kak-sobrat-ba'),
    cover: cover(
      44,
      'iYrUIP3C0HvNz_ZmWABERSWSDgh9AU0MLDxXH1P20GTrPt4k-WqqzYR9KBaYp6UH16EUwVrahint6DA47rpLOTce',
      95,
      '32x13,48x19,72x29,108x43,160x63,240x95,360x143,480x190,540x214,640x254,720x285,1080x428,1280x507,1440x571,1590x630'
    ),
    ratio: 1590 / 630
  },
  {
    name: 'Марсала',
    niche: 'Банкетный зал',
    city: 'Санкт-Петербург',
    channel: 'Яндекс Директ',
    value: '151',
    unit: 'лид за месяц по 127 ₽',
    note: 'В первый месяц — 31 лид по 806 ₽.',
    href: article('keis-prodvizhenie-banketnogo-zala-marsala-v-spb-lidogeneraci'),
    cover: cover(
      66,
      'NHvOxb7w-sgiynUebIeDNqq-CMXRgazpQ3ZWOuA5mAV5eMK20QbHe1DwWyY70EglGgLOVR7Y_6rQaiWL_ZcRym55',
      95,
      '32x17,48x26,72x38,108x58,160x85,240x128,360x192,480x256,540x289,640x342,720x385,1080x577,1280x684,1440x769,1778x950'
    ),
    ratio: 1778 / 950
  },
  {
    name: 'КЭФ',
    niche: 'Банкетный зал',
    channel: 'Сайт и Яндекс Директ',
    value: '299 ₽',
    unit: 'за заявку — 58 лидов за месяц',
    note: 'Стоимость тысячи показов снизили в 3,4 раза.',
    href: article('keis-razrabotka-saita-i-nastroika-yandeksdirekt-dlya-banketn'),
    cover: cover(
      72,
      'mfNm-5fVwmv_QDh8x_ETQtX_M-OAfIdR5lBVHxR5NJGgnQdPhpY3lknavJuj5BkYxVO4SzzvKKogxajc3uffDIWQ',
      95,
      '32x17,48x26,72x39,108x58,160x87,240x130,360x195,480x260,540x292,640x346,720x390,1080x585,1280x693,1440x780,2560x1386'
    ),
    ratio: 2560 / 1386
  },
  {
    name: 'Сушиселл',
    niche: 'Франшиза доставки',
    channel: 'Яндекс Директ',
    value: '120',
    unit: 'заявок на франшизу за четыре месяца',
    note: 'Стоимость заявки: с ~5 000 до 1 983 ₽.',
    href: article('keis-privlechenie-zayavok-na-franshizu-dostavki-sushi-i-roll'),
    cover: cover(
      62,
      'p00Qh6ruiE34l4jppPNsiuj735O6QRc5saBOulaXi7eNr5sYTsls6_IgKgwmUB3sjmT85_8n2_R_gJPPOAZRVEqc',
      95,
      '32x20,48x31,72x46,108x69,160x102,240x153,360x230,480x307,540x345,640x409,720x460,1080x690,1280x818,1440x920,2426x1550'
    ),
    ratio: 2426 / 1550
  },
  {
    name: 'Ёбидоёби',
    niche: 'Франшиза доставки',
    channel: 'Лидогенерация на франшизу',
    value: '155',
    unit: 'заявок на франшизу по 1 264 ₽',
    note: 'Бюджет — 196 030 ₽.',
    href: article('keis-prodvizhenie-franshizy-ebidoebi-lidogeneraciya-na-fra'),
    cover: cover(
      11,
      'swm8S__lj_vumChzATowRYTD9h22tVeBc879JdjAKMYZ3LG4j5E2NzHQa5REjeYuzwVswDNVMlfxwWQv7Wi1RB5x',
      95,
      '32x20,48x30,72x45,108x67,160x99,240x149,360x224,480x298,540x336,640x398,720x448,1080x671,1280x796,1335x830'
    ),
    ratio: 1335 / 830
  },
  {
    name: 'Вебинар Ёбидоёби',
    niche: 'Онлайн-эфир',
    channel: 'Реклама и блогеры',
    value: '1 509',
    unit: 'регистраций на эфир',
    note: 'Эфир посмотрели 1 218 человек, 71 заявка на обучение.',
    href: article('keis-prodvizhenie-vebinara-sovladelca-ebidoebi-konstantina-z'),
    cover: cover(
      15,
      'XtxX2n50DPN-5C9r0fbWUND76eANeFM_gPOYZVzFsDtTcpIpFsFrHJzWLNeWA78OJwziluadZck6s54i-Uoobzey',
      95,
      '32x18,48x26,72x39,108x59,160x88,240x132,360x197,480x263,540x296,640x351,720x395,1080x592,1280x701,1440x789,1478x810'
    ),
    ratio: 1478 / 810
  },
  {
    name: 'Kvanta',
    niche: 'Автосалон электромобилей',
    channel: 'Без сайта и контекстной рекламы',
    value: '472',
    unit: 'заявки в месяц',
    note: 'В первый месяц работы было 30.',
    href: article('keis-500-zayavok-v-mesyac-na-elektromobili-bez-saita-i-konte'),
    cover: cover(
      81,
      'x_kNGfEdRZiSfOMpqbYTSKlwABSS2bEVy_e5LaOHBTFtWgjT4sa-1RpJ6bD7aEJ-Fus5uM-VAVZrtRAeBm259fjB',
      96,
      '32x18,48x27,72x40,108x61,160x90,240x135,360x202,480x270,540x304,640x360,720x405,1080x607,1280x720,1440x810,1920x1080'
    ),
    ratio: 1920 / 1080
  },
  {
    name: 'Муза',
    niche: 'Репутация на картах',
    city: 'Калининград',
    channel: '2ГИС',
    value: '3,4 → 4,6',
    unit: 'рейтинг в 2ГИС за месяц',
    note: 'Модерация негатива и работа с отзывами.',
    href: article('keis-podnyali-reiting-na-kartah-s-34-do-46-za-mesyac-na-2gis'),
    cover: cover(
      69,
      'js0hYBI30wzMNgTLHJqFEkQw-PpBQdtoioDZGQZrRmpLt3jbAlpxbpQX184D1GjMZvOJbTDtVAbDdhDScuUfYx_A',
      95,
      '32x10,48x14,72x22,108x33,160x48,240x72,360x109,480x145,540x163,640x193,720x217,1080x326,1280x386,1440x434,1572x474'
    ),
    ratio: 1572 / 474
  },
  {
    name: 'Автосим',
    niche: 'Клуб автосимуляторов',
    city: 'Оренбург',
    channel: 'Бренд, приложение, сайт',
    value: '10 → 30%',
    unit: 'доля повторных визитов',
    note: '170 регистраций в приложении за два месяца.',
    href: article('keis-kak-iz-prikolnogo-mesta-o-kotorom-nikto-ne-znaet-sdelat'),
    cover: cover(
      50,
      'SOHplUOb-JVBUqz-goqtS7P0iql0tELa4Y-LJifwJMH9nLUQM3SnpfRYReySasAFs2skJ3WeZXfp6m8c5T-3wqLf',
      95,
      '32x16,48x24,72x36,108x54,160x79,240x119,360x179,480x238,540x268,640x317,720x357,1080x536,1262x626'
    ),
    ratio: 1262 / 626
  },
  {
    name: 'Bytime × Точка',
    niche: 'Фестиваль для предпринимателей',
    city: 'Санкт-Петербург',
    channel: 'Яндекс Директ и VK Реклама',
    value: '317',
    unit: 'заявок на фестиваль',
    note: '178 из Директа по 334 ₽ и 139 из VK по 419 ₽.',
    href: article('keis-lidogeneraciya-na-festival-dlya-predprinimatelei-v-spb'),
    cover: cover(
      49,
      'jk9vnvGwkxrNSuT3VReyE3IqSiEguNvg2YKE3XBN6IESiGfo2Pt_hYC3ubDUWtxcv8ot1Yi9DG9Fk31Gu4EtLgkC',
      95,
      '32x15,48x23,72x34,108x51,160x75,240x113,360x169,480x225,540x253,640x300,720x338,1080x507,1280x601,1440x676,1892x888'
    ),
    ratio: 1892 / 888
  },
  {
    name: 'Форт Боярд',
    niche: 'Шоу-квест',
    city: 'Оренбург',
    channel: 'VK Реклама',
    value: '635',
    unit: 'целевых заявок по 299 ₽',
    note: 'Заявки на игры в шоу-квест.',
    href: article('keis-prodvizhenie-legendarnogo-shou-kvesta-fort-boyard-v-ore'),
    cover: cover(
      66,
      'Kxobrt1Mn0wemI71K_UrX_SviQjGp_dZWQLHpsXPXBBEh-F6Njk_AX9ZzYa3JAYv3BfvHd_icuSz-EoM9VcnxB2C',
      96,
      '32x32,48x48,72x72,108x108,160x160,240x240,360x360,480x480,540x540,640x640,720x720,1000x1000'
    ),
    ratio: 1
  },
  {
    name: 'Золотая лихорадка',
    niche: 'Шоу-квест',
    city: 'Оренбург',
    channel: 'VK Реклама',
    value: '85–120',
    unit: 'заявок в месяц по 249 ₽',
    note: 'Стабильный поток из месяца в месяц.',
    href: article('keis-85-120-zayavok-v-mesyac-po-249-rublei-v-shou-kvest-v-or'),
    cover: cover(
      25,
      'L8BmC55mxdCKLwDVJ62jqPO1DT96caW5V6ZBbwvXJaBvyOlLDMA4BLtBwZ7Vxj1NUPtOSDiAUvTT-8i11sV0Ikf8',
      96,
      '32x32,48x48,72x72,108x108,160x160,240x240,360x360,480x480,540x540,640x640,720x720,1000x1000'
    ),
    ratio: 1
  },
  {
    name: 'Элизиум',
    niche: 'Сеть квестов',
    city: 'Тольятти',
    channel: 'VK Реклама',
    value: '190',
    unit: 'заявок по 265 ₽',
    note: 'Таргетированная реклама ВКонтакте.',
    href: article('keis-190-zayavok-po-265-cherez-targetirovannuu-reklamu-vk-pr'),
    cover: cover(
      25,
      'QDBwwdMULMzY8CymhbyWNPcNoyBi_oeV0WWVeNwfJV9IVlE80rXqCUqr2pZlzgAMVBDs6mEU4egd2coytZVEOwd7',
      96,
      '32x57,48x85,72x128,108x192,160x284,240x427,360x640,480x853,540x960,640x1138,720x1280,1080x1920'
    ),
    ratio: 1080 / 1920
  },
  {
    name: 'Prosto Street Wear',
    niche: 'Магазин уличной одежды',
    city: 'Москва',
    channel: 'VK Реклама',
    value: '492',
    unit: 'лида за месяц по 103 ₽',
    note: 'Заявки из ВКонтакте.',
    href: article('keis-492-lida-za-mesyac-po-103-iz-vkontakte-prodvizhenie-mag'),
    cover: cover(
      75,
      'iroEFJ2MiOejN5AsEdbf2k1yzFEGsTXxWdsc3DqT1-Lhz7Ghw0gr2OKoZCYJ_1CjUH6LoBN0YjAOwpwNuN6JxXzC',
      96,
      '32x57,48x85,72x128,108x192,160x284,240x427,360x640,480x853,540x960,640x1138,720x1280'
    ),
    ratio: 720 / 1280
  },
  {
    name: 'Rules Four',
    niche: 'Авторское ателье',
    city: 'Москва',
    channel: 'VK Реклама',
    value: '26',
    unit: 'заявок на индивидуальный пошив',
    note: 'По 1 150 ₽ при бюджете 29 922 ₽.',
    href: article('keis-targetirovannaya-reklama-na-individualnyi-poshiv-odezhd'),
    cover: cover(
      78,
      'X8nyDQ8vsP2uv139sL_zU23CMTXo3me3BDkTDWBDPaO4-q0PNIC0HyKMFGhCt0FYCC7Bc328SndPw-rCX60k4LcI',
      95,
      '32x32,48x48,72x72,108x108,160x160,240x240,360x360,480x480,540x540,640x640,720x720,1080x1080'
    ),
    ratio: 1
  },
  {
    name: 'Руки Вверх! Бар',
    niche: 'Бар',
    city: 'Самара',
    channel: 'Соцсети и реклама',
    value: '~70',
    unit: 'броней столов в неделю',
    note: 'Столы от четырёх гостей, с депозитом.',
    href: article('keis-prodvizhenie-bar-ruki-vverh-bara-v-samare'),
    cover: cover(
      23,
      '2P7ruqI4O91LOFL-H9zeNrLisdzVBUBBZHZQWhO-W0mEwKsfhbRExKMDyjQn7ZMwkBXpUY9sPQXbQRsjJYss8qL8',
      95,
      '32x23,48x34,72x51,108x77,160x113,240x170,360x255,480x340,540x383,640x454,720x511,1080x766'
    ),
    ratio: 1080 / 766
  },
  {
    name: 'Studio 57',
    niche: 'Караоке-холл',
    city: 'Самара',
    channel: 'Соцсети и реклама',
    value: '~60',
    unit: 'броней столов в неделю',
    note: 'Охват — около 20 000 человек в неделю.',
    href: article('keis-prodvizhenie-karaoke-holla-studio-57-v-samare'),
    cover: cover(
      49,
      'AaDSqajToN5vlCpX44sT_I48cjDIDI2cWWLao8yXuxTaAg1ueVAB5iWgF-2zQGNeyhiuq39656xYXZtmvZr1E9A0',
      95,
      '32x21,48x32,72x48,108x72,160x107,240x160,360x240,480x320,540x360,640x427,720x480,1080x720,1280x853,1440x960,2560x1707'
    ),
    ratio: 2560 / 1707
  },
  {
    name: 'Небар',
    niche: 'Ночной клуб',
    city: 'Самара',
    channel: 'Соцсети и реклама',
    value: '~60',
    unit: 'броней столов в неделю',
    note: 'Охват — около 10 000 человек в неделю.',
    href: article('keis-prodvizhenie-nochnogo-kluba-nebar-v-samare'),
    cover: cover(
      44,
      'wDlXBq9a_P5swWwFYBbsqka70UXPFvICC4P0oD2HRe8q37Oi7UKknJXDhtZMxern637HDDT-t0QN22xheOB06G_l',
      95,
      '32x13,48x20,72x30,108x45,160x67,240x101,360x151,480x202,540x227,640x269,720x303,1022x430'
    ),
    ratio: 1022 / 430
  },
  {
    name: 'Малый Маркет',
    niche: 'Сеть продуктовых магазинов',
    city: 'Москва',
    channel: 'Геотаргетинг',
    value: '104 ₽',
    unit: 'за тысячу показов вокруг магазинов',
    note: 'Узнаваемость восьми точек на открытии.',
    href: article('keis-prodvizhenie-seti-produktovyh-magazinov-malyi-market-v'),
    cover: cover(
      1,
      'CyH-VOlDaSs5lLESb5T6jsqb3NOToI9Pp0IOOvmRUa9SFwYLr0HssjxF4sfcaj8AJfofRItols_-ogCTwAn4ZY5p',
      96,
      '32x11,48x16,72x24,108x36,160x53,240x80,360x120,480x160,540x180,640x213,720x240,1080x360,1280x427,1440x480,1590x530'
    ),
    ratio: 1590 / 530
  },
  {
    name: 'Marzi Pani',
    niche: 'Эко-кондитерская',
    city: 'Оренбург',
    channel: 'Соцсети',
    value: '292 645 ₽',
    unit: 'выручки за месяц с рекламы',
    note: 'При расходе 56 836 ₽.',
    href: article('keis-prodvizhenie-marzi-pani-pervoi-eko-konditerskoi-v-orenb'),
    cover: cover(
      12,
      '9gIIG_pm6J2cFJPZZvlfBKhLiU3E2ceU2n0jMKfh0v1ZrF-5dBBjrjcwrgiF71Qpgmv81QaLxEuceqSCz0pjo-ov',
      96,
      '32x21,48x32,72x48,108x72,160x107,240x160,360x240,480x320,540x360,640x426,720x480,1080x719,1280x852,1440x959,2560x1705'
    ),
    ratio: 2560 / 1705
  },
  {
    name: 'Bombinate',
    niche: 'Клубника в шоколаде',
    city: 'Оренбург',
    channel: 'ВКонтакте',
    value: '45–60 ₽',
    unit: 'стоимость клиента',
    note: '3–4 клиента в день при бюджете около 5 000 ₽ в месяц.',
    href: article('keis-prodvizhenie-klubnichnoi-masterskoi-bombinate-v-orenbur'),
    cover: cover(
      44,
      'RmHLUZRFnueUAC9NINFNImbe0D2VXMQxWwkTzNrMES8Kzwh9QJ1uClyB3wR3L64PMdwZimKXJq3ZflATU_U1Dpse',
      96,
      '32x21,48x32,72x48,108x72,160x107,240x160,360x240,480x320,540x360,640x426,720x480,1080x720,1100x733'
    ),
    ratio: 1100 / 733
  },
  {
    name: 'Банкротство',
    niche: 'Юридические услуги',
    channel: 'Яндекс Директ',
    value: '0',
    unit: 'договоров при 42 лидах',
    note: 'Анти-кейс: 89 124 ₽ бюджета, лид по 2 122 ₽. Разобрали, почему не сработало.',
    anti: true,
    href: article('anti-keis-89-000-na-direkt-v-nishe-bankrotstva-42-lida-i-0-d'),
    cover: cover(
      43,
      'sbf5IxBY818ZnvUA4MuVWKvr1Ud1TMJ779VePsd96SzRx_nGAkbfnT0OIanMGERXjmbAeYgu7CAR2p-vcDKJjJ2H',
      95,
      '32x18,48x27,72x40,108x60,160x89,240x134,360x201,480x268,540x302,640x358,720x403,1080x604,1280x716,1440x805,1677x938'
    ),
    ratio: 1677 / 938
  }
];

/** Recognisable brands and the strongest before → after go first; the rest keep the blog's order. */
const FIRST = ['Ёбидоёби', 'Сушиселл', 'Форт Боярд', 'Bytime × Точка'];
const rank = (item: CaseStudy) => {
  const i = FIRST.indexOf(item.name);
  return i === -1 ? FIRST.length : i;
};

export const cases: CaseStudy[] = [...published].sort((a, b) => rank(a) - rank(b));
