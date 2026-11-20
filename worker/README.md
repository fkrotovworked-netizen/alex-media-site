# Как включить AI-ассистента Алекса и заявки с сайта

Сайт лежит на GitHub Pages — это просто файлы, своего сервера у него нет. Поэтому заявки с форм
и ответы Алекса идут через маленький бесплатный сервер-посредник на Cloudflare (Worker).
Он хранит все ключи у себя: в коде сайта их не видно никому.

Пока ключей нет, сайт работает честно: формы пишут «форма пока не подключена»,
а Алекс отвечает «я пока учусь» и предлагает Telegram.

Понадобится один раз, примерно 15–20 минут.

## 1. Cloudflare (бесплатно)

1. Зарегистрироваться на https://dash.cloudflare.com/sign-up.
2. На своём компьютере, в папке проекта, войти в аккаунт:
   ```bash
   npx wrangler login
   ```
   Откроется браузер — нажать «Allow».

## 2. Ключ для Алекса (модель)

Подписка ChatGPT Plus для сайта не подходит: нужен отдельный ключ разработчика (API),
оплата — за каждое сообщение. OpenAI не принимает российские карты, поэтому удобнее сервис-посредник
с оплатой в рублях. По умолчанию настроен **ProxyAPI** (https://proxyapi.ru):

1. Зарегистрироваться, пополнить баланс (для начала хватит нескольких сотен рублей).
2. В личном кабинете создать ключ — строка вида `sk-...`.

Другой сервис тоже подойдёт, если он «совместим с OpenAI API» (VseGPT, OpenRouter, сам OpenAI):
тогда поменять в `worker/wrangler.toml` строки `AI_BASE_URL` (адрес API сервиса)
и `AI_MODEL` (название модели).

## 3. Telegram и почта для заявок

- **Telegram:** написать @BotFather → `/newbot` → получить токен бота. Написать своему боту любое сообщение
  (или добавить его в рабочую группу). Номер чата взять у бота @userinfobot (для группы — @getidsbot).
- **Почта:** зарегистрироваться на https://resend.com → API Keys → создать ключ.
  Пока у агентства нет своего домена в Resend, письма приходят только на почту, на которую заведён аккаунт.

## 4. Вставить ключи и запустить

В папке проекта выполнить по одной команде; каждая попросит вставить значение:

```bash
npx wrangler secret put AI_KEY --config worker/wrangler.toml
```
```bash
npx wrangler secret put TG_TOKEN --config worker/wrangler.toml
```
```bash
npx wrangler secret put TG_CHAT_ID --config worker/wrangler.toml
```
```bash
npx wrangler secret put RESEND_KEY --config worker/wrangler.toml
```
```bash
npx wrangler secret put LEAD_EMAIL --config worker/wrangler.toml
```

Запустить сервер-посредник:

```bash
npx wrangler deploy --config worker/wrangler.toml
```

В конце команда напечатает адрес вида `https://alex-media-lead.<имя>.workers.dev`.

## 5. Сказать сайту, куда слать

На GitHub: репозиторий → Settings → Secrets and variables → Actions → вкладка **Variables** →
New variable: имя `LEAD_ENDPOINT`, значение — адрес из шага 4. Затем Actions → последняя сборка →
Re-run (или любой новый пуш). После пересборки формы и Алекс заработают.

## Когда меняются тексты сайта

Алекс знает только то, что написано на сайте (услуги, цены, кейсы, FAQ). После правок текстов:

```bash
npm run knowledge
```
```bash
npx wrangler deploy --config worker/wrangler.toml
```

## Для разработки

`node tools/mock-assistant.mjs` — запускает этот же Worker локально с поддельной моделью и перехватом
Telegram/почты; сайт открыть с `?alex=http://localhost:8787/chat`.
