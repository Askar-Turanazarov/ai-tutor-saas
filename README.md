<div align="center">

# Ustoz AI

**[English](#en) · [Oʻzbekcha](#uz) · [Русский](#ru)**

</div>

---

<a id="en"></a>

## English

A personal AI English tutor from Tashkent: a chat that reviews your mistakes, topics from A1 to C2, a Duolingo-style personal plan with quizzes, and a pronunciation coach. The interface is available in English, Uzbek and Russian, with light and dark themes.

### Getting started

```bash
npm install
cp .env.example .env      # then set AUTH_SECRET and, optionally, AI keys
npm run setup             # creates the SQLite database and demo data
npm run dev               # http://localhost:3000
```

No sign-up needed: the **Start** button creates a guest account (Free plan) right away. A guest can create a full account later from **Settings** and keep all their progress.

### Demo accounts

Emails and passwords are set in `.env` (`SEED_*` variables):

| Role  | Email               | Subscription                       |
|-------|---------------------|------------------------------------|
| Admin | `admin@ustoz.local` | Pro, granted by admin              |
| Free  | `free@ustoz.local`  | —                                  |
| Plus  | `plus@ustoz.local`  | Plus, monthly, saved Uzcard card   |
| Pro   | `pro@ustoz.local`   | Pro, monthly, saved HUMO card      |

### Plans

| | Free | Plus | Pro |
|---|---|---|---|
| Levels | A1–A2 | A1–C2 | A1–C2 |
| Practice time per day | 15 min | 60 min | unlimited |
| Personal plan | — | ✓ | ✓ |
| Mistake review | short | detailed | detailed + alternatives |
| Pronunciation coach | — | 10 phrases a day | unlimited |
| Price per month | 0 | 49 000 UZS / $3.99 | 89 000 UZS / $6.99 |

- Periods: 1, 3 and 12 months (−10% and −25%).
- **Trial:** 7 days of Pro, once per account, no card needed.
- **Upgrade** Plus → Pro happens right away: you pay only the difference for the days left, and the renewal date stays the same.
- **Downgrade** and **cancellation** take effect at the end of the paid period.
- **Failed renewal:** the subscription goes to `past_due`, access stays for a 3-day grace period, then the account returns to Free.
- Limits reset at midnight Tashkent time. Admins can change all limits, prices, discounts, trial and grace length in **Settings**.

### Payments

The **Plans** page (`/app/plans`) opens the checkout. Subscription, invoices and saved cards are on `/app/billing`. There are three payment methods; every one goes through the same layer (`src/lib/billing/providers`).

**Uzcard / HUMO — full emulation.** No real card, SMS or money is involved. Any 16-digit number works: 9860… is HUMO, anything else is Uzcard. Any 6-digit SMS code works (a test code is shown on screen). Test numbers:

- ending in `0000` — the bank declines the payment;
- ending in `1111` — the first payment succeeds, but the automatic renewal is declined (use it to test `past_due`).

**How Uzcard/HUMO work in real life.** A merchant can't connect to the Uzcard or HUMO processing directly. You sign a contract with an aggregator (Payme, Click, Atmos, Uzum…), and it gives you an API:

1. Card number and expiry date are sent to the aggregator, never stored by the merchant.
2. The bank sends an SMS code to the card owner's phone; the code confirms the card.
3. The aggregator returns a **token**. The merchant keeps only the token and the last 4 digits.
4. Payments, including monthly renewals, are charged by token without the card owner.

The emulator follows exactly these steps (`card-mock.ts`). For production, the mock is replaced by the aggregator's API calls.

**Click — SHOP API mock.** The checkout redirects to a page that looks like my.click.uz. The emulator calls our own `/api/billing/click/prepare` and `/complete` endpoints with a real MD5 signature, error codes and idempotency, just like Click does. To go live, set `CLICK_MODE=live`, `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID` and `CLICK_SECRET_KEY`, and enter the endpoint URLs in the Click merchant cabinet. Click doesn't charge saved cards, so a Click subscription is renewed manually.

**Stripe — real test mode** (Visa / Mastercard, USD). The option appears once a key is set:

1. Create an account at stripe.com and switch to **Test mode**.
2. Copy the `sk_test_…` key from **Developers → API keys** to `STRIPE_SECRET_KEY`.
3. Optionally, for webhooks: `stripe listen --forward-to localhost:3000/api/billing/stripe/webhook`, then copy the `whsec_…` secret to `STRIPE_WEBHOOK_SECRET`. Without the CLI the payment is still confirmed when the user returns from Checkout.
4. Test card: `4242 4242 4242 4242`, any future date, any CVC. Declined card: `4000 0000 0000 0002`.

Products and prices are created automatically; nothing needs to be set up in the Stripe Dashboard. Cancellation and card changes go through the Stripe Customer Portal.

**Automatic renewals** run lazily when a user opens the app, and in bulk via `POST /api/billing/renew` with the `Authorization: Bearer $CRON_SECRET` header (for an external cron), or with the button in the admin panel.

### AI

Add keys to `.env`: `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`. Any combination works.

- The router discovers the current models on its own and tries the fast ones first. Slow Pro models go last.
- On an error, overload or timeout it quietly moves on to the next model.
- If every model is unavailable, a built-in offline tutor answers, so users never see an error.

### Admin panel — `/admin`

- **Overview** — stats and recent payments.
- **Users** — plan, level, limit reset, "log in as", delete.
- **Subscriptions** — subscriptions and invoices; test tools: "fast-forward to the period end / grace end", "run renewals", refunds, grant a plan for N days.
- **AI models** — fallback chain, paused models, a test request, call log.
- **Topics** — which topics are Pro-only.
- **Settings** — limits and prices of every plan, discounts, trial and grace length, offline mode, provider order.

### Stack

Next.js 15 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Framer Motion · Prisma + SQLite · next-intl · Stripe · Web Speech API.

---

<a id="uz"></a>

## Oʻzbekcha

Toshkentdan shaxsiy AI ingliz tili ustozi: xatolarni tahlil qiladigan chat, A1 dan C2 gacha mavzular, Duolingo uslubidagi testlardan iborat shaxsiy reja va talaffuz trenajyori. Interfeys oʻzbek, rus va ingliz tillarida, yorugʻ va qorongʻi mavzular bilan.

### Ishga tushirish

```bash
npm install
cp .env.example .env      # soʻng AUTH_SECRET va (ixtiyoriy) AI kalitlarini kiriting
npm run setup             # SQLite bazasi va demo maʼlumotlarni yaratadi
npm run dev               # http://localhost:3000
```

Roʻyxatdan oʻtish shart emas: **Boshlash** tugmasi darhol mehmon hisobini (Free tarif) yaratadi. Keyinroq mehmon **Sozlamalar** boʻlimida toʻliq hisob yaratishi mumkin, barcha natijalar saqlanib qoladi.

### Demo hisoblar

Email va parollar `.env` faylida (`SEED_*` oʻzgaruvchilari) koʻrsatilgan:

| Rol   | Email               | Obuna                                   |
|-------|---------------------|-----------------------------------------|
| Admin | `admin@ustoz.local` | Pro, admin tomonidan berilgan           |
| Free  | `free@ustoz.local`  | —                                       |
| Plus  | `plus@ustoz.local`  | Plus, oylik, saqlangan Uzcard kartasi   |
| Pro   | `pro@ustoz.local`   | Pro, oylik, saqlangan HUMO kartasi      |

### Tariflar

| | Free | Plus | Pro |
|---|---|---|---|
| Darajalar | A1–A2 | A1–C2 | A1–C2 |
| Kunlik mashgʻulot vaqti | 15 daq | 60 daq | cheksiz |
| Shaxsiy reja | — | ✓ | ✓ |
| Xatolar tahlili | qisqa | batafsil | batafsil + muqobillar |
| Talaffuz trenajyori | — | kuniga 10 ibora | cheksiz |
| Oylik narx | 0 | 49 000 soʻm / $3.99 | 89 000 soʻm / $6.99 |

- Davrlar: 1, 3 va 12 oy (−10% va −25%).
- **Sinov davri:** 7 kun Pro, har bir hisob uchun bir marta, kartasiz.
- **Plus → Pro ga oʻtish** darhol: faqat qolgan kunlar uchun farq toʻlanadi, uzaytirish sanasi oʻzgarmaydi.
- **Arzonroq tarifga oʻtish** va **bekor qilish** toʻlangan davr oxirida kuchga kiradi.
- **Uzaytirish muvaffaqiyatsiz boʻlsa:** obuna `past_due` holatiga oʻtadi, kirish 3 kunlik imtiyozli davrda saqlanadi, soʻng hisob Free ga qaytadi.
- Limitlar Toshkent vaqti bilan yarim tunda yangilanadi. Barcha limitlar, narxlar, chegirmalar, sinov va imtiyozli davr uzunligi admin panelning **Sozlamalar** boʻlimida oʻzgartiriladi.

### Toʻlovlar

**Tariflar** sahifasi (`/app/plans`) toʻlovni ochadi. Obuna, hisob-fakturalar va saqlangan kartalar — `/app/billing` da. Toʻlovning uchta usuli bor, barchasi bitta qatlam orqali ishlaydi (`src/lib/billing/providers`).

**Uzcard / HUMO — toʻliq emulyatsiya.** Haqiqiy karta, SMS va pul ishlatilmaydi. Istalgan 16 xonali raqam qabul qilinadi: 9860… — HUMO, qolganlari — Uzcard. Istalgan 6 xonali SMS-kod mos keladi (test kodi ekranda koʻrsatiladi). Test raqamlari:

- `0000` bilan tugasa — bank toʻlovni rad etadi;
- `1111` bilan tugasa — birinchi toʻlov oʻtadi, avtomatik uzaytirish rad etiladi (`past_due` ni tekshirish uchun).

**Uzcard/HUMO haqiqatda qanday ishlaydi.** Sotuvchi Uzcard yoki HUMO protsessingiga toʻgʻridan-toʻgʻri ulana olmaydi. Agregator (Payme, Click, Atmos, Uzum…) bilan shartnoma tuziladi, u API beradi:

1. Karta raqami va amal qilish muddati agregatorga yuboriladi, sotuvchida saqlanmaydi.
2. Bank karta egasining telefoniga SMS-kod yuboradi, kod kartani tasdiqlaydi.
3. Agregator **token** qaytaradi. Sotuvchi faqat token va oxirgi 4 raqamni saqlaydi.
4. Toʻlovlar, jumladan oylik uzaytirishlar, karta egasisiz token boʻyicha yechiladi.

Emulyator aynan shu bosqichlarni takrorlaydi (`card-mock.ts`). Production uchun mock agregator API chaqiruvlariga almashtiriladi.

**Click — SHOP API moki.** Toʻlov my.click.uz ga oʻxshash sahifaga yoʻnaltiradi. Emulyator xuddi Click kabi bizning `/api/billing/click/prepare` va `/complete` endpointlarimizni haqiqiy MD5 imzo, xato kodlari va idempotentlik bilan chaqiradi. Haqiqiy rejimga oʻtish uchun `CLICK_MODE=live`, `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID` va `CLICK_SECRET_KEY` ni kiriting hamda endpoint manzillarini Click merchant kabinetida koʻrsating. Click saqlangan kartadan yechmaydi, shuning uchun Click obunasi qoʻlda uzaytiriladi.

**Stripe — haqiqiy test rejimi** (Visa / Mastercard, USD). Kalit kiritilgach, usul paydo boʻladi:

1. stripe.com da hisob yarating va **Test mode** ga oʻting.
2. **Developers → API keys** dagi `sk_test_…` kalitini `STRIPE_SECRET_KEY` ga yozing.
3. Ixtiyoriy, webhooklar uchun: `stripe listen --forward-to localhost:3000/api/billing/stripe/webhook`, soʻng `whsec_…` sirini `STRIPE_WEBHOOK_SECRET` ga yozing. CLI siz ham toʻlov foydalanuvchi Checkout dan qaytganda tasdiqlanadi.
4. Test kartasi: `4242 4242 4242 4242`, istalgan kelajakdagi sana, istalgan CVC. Rad etiladigan karta: `4000 0000 0000 0002`.

Mahsulot va narxlar avtomatik yaratiladi, Stripe Dashboard da hech narsa sozlash shart emas. Bekor qilish va kartani almashtirish Stripe Customer Portal orqali.

**Avtomatik uzaytirish** foydalanuvchi ilovani ochganda ishlaydi, ommaviy ravishda esa `Authorization: Bearer $CRON_SECRET` sarlavhasi bilan `POST /api/billing/renew` orqali (tashqi cron uchun) yoki admin paneldagi tugma bilan.

### AI

`.env` fayliga kalitlarni kiriting: `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`. Istalgan kombinatsiya ishlaydi.

- Router dolzarb modellarni oʻzi topadi va avval tezkorlarini sinaydi. Sekin Pro modellar oxirida turadi.
- Xato, yuklama yoki taymaut boʻlsa, sezdirmasdan keyingi modelga oʻtadi.
- Hech bir model ishlamasa, oʻrnatilgan oflayn ustoz javob beradi — foydalanuvchi hech qachon xato koʻrmaydi.

### Admin panel — `/admin`

- **Umumiy** — statistika va soʻnggi toʻlovlar.
- **Foydalanuvchilar** — tarif, daraja, limitni tiklash, “sifatida kirish”, oʻchirish.
- **Obunalar** — obunalar va hisob-fakturalar; test vositalari: “davr / imtiyoz oxiriga oʻtkazish”, “uzaytirishlarni ishga tushirish”, qaytarish, N kunga tarif berish.
- **AI modellar** — zaxira zanjiri, pauzadagi modellar, test soʻrovi, chaqiruvlar jurnali.
- **Mavzular** — qaysi mavzular faqat Pro uchun.
- **Sozlamalar** — har bir tarifning limitlari va narxlari, chegirmalar, sinov va imtiyozli davr, oflayn rejim, provayderlar tartibi.

### Texnologiyalar

Next.js 15 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Framer Motion · Prisma + SQLite · next-intl · Stripe · Web Speech API.

---

<a id="ru"></a>

## Русский

Персональный AI-репетитор английского из Ташкента: чат с разбором ошибок, темы от A1 до C2, персональный план с квизами в стиле Duolingo и тренажёр произношения. Интерфейс на русском, узбекском и английском, светлая и тёмная темы.

### Запуск

```bash
npm install
cp .env.example .env      # затем впишите AUTH_SECRET и (по желанию) ключи AI
npm run setup             # создаёт SQLite-базу и демо-данные
npm run dev               # http://localhost:3000
```

Регистрация не обязательна: кнопка **«Начать»** сразу создаёт гостевой аккаунт (тариф Free). Позже гость может создать полноценный аккаунт в **«Настройках»**, и весь прогресс сохранится.

### Демо-аккаунты

Почта и пароли задаются в `.env` (переменные `SEED_*`):

| Роль  | Email               | Подписка                                 |
|-------|---------------------|------------------------------------------|
| Админ | `admin@ustoz.local` | Pro, выдан админом                       |
| Free  | `free@ustoz.local`  | —                                        |
| Plus  | `plus@ustoz.local`  | Plus, помесячно, сохранённая карта Uzcard |
| Pro   | `pro@ustoz.local`   | Pro, помесячно, сохранённая карта HUMO   |

### Тарифы

| | Free | Plus | Pro |
|---|---|---|---|
| Уровни | A1–A2 | A1–C2 | A1–C2 |
| Время практики в день | 15 мин | 60 мин | без лимита |
| Персональный план | — | ✓ | ✓ |
| Разбор ошибок | краткий | подробный | подробный + альтернативы |
| Тренажёр произношения | — | 10 фраз в день | без лимита |
| Цена в месяц | 0 | 49 000 сум / $3.99 | 89 000 сум / $6.99 |

- Периоды: 1, 3 и 12 месяцев (−10% и −25%).
- **Пробный период:** 7 дней Pro, один раз на аккаунт, без карты.
- **Повышение** Plus → Pro — сразу: доплачивается только разница за оставшиеся дни, дата продления не меняется.
- **Понижение** и **отмена** вступают в силу в конце оплаченного периода.
- **Неудачное продление:** подписка переходит в `past_due`, доступ сохраняется на 3 дня льготного периода, затем аккаунт возвращается на Free.
- Лимиты сбрасываются в полночь по Ташкенту. Все лимиты, цены, скидки, длина пробного и льготного периода меняются в админке в **«Параметрах»**.

### Оплата

Страница **«Тарифы»** (`/app/plans`) открывает оформление. Подписка, счета и сохранённые карты — на `/app/billing`. Способов оплаты три, все работают через один слой (`src/lib/billing/providers`).

**Uzcard / HUMO — полная эмуляция.** Настоящая карта, SMS и деньги не используются. Принимается любой 16-значный номер: 9860… — HUMO, остальные — Uzcard. Подходит любой 6-значный SMS-код (тестовый код показан на экране). Тестовые номера:

- на `0000` — банк отклоняет оплату;
- на `1111` — первая оплата проходит, а автопродление отклоняется (для проверки `past_due`).

**Как Uzcard/HUMO работают на самом деле.** Магазин не может подключиться к процессингу Uzcard или HUMO напрямую. Заключается договор с агрегатором (Payme, Click, Atmos, Uzum…), и он даёт API:

1. Номер карты и срок действия уходят агрегатору, магазин их не хранит.
2. Банк отправляет SMS-код на телефон владельца карты, код подтверждает карту.
3. Агрегатор возвращает **токен**. Магазин хранит только токен и последние 4 цифры.
4. Платежи, в том числе ежемесячные продления, списываются по токену без участия владельца карты.

Эмулятор повторяет ровно эти шаги (`card-mock.ts`). Для продакшена мок заменяется вызовами API агрегатора.

**Click — мок SHOP API.** Оформление ведёт на страницу в стиле my.click.uz. Эмулятор, как и настоящий Click, вызывает наши эндпоинты `/api/billing/click/prepare` и `/complete` с настоящей MD5-подписью, кодами ошибок и идемпотентностью. Чтобы перейти на настоящий Click, задайте `CLICK_MODE=live`, `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY` и укажите адреса эндпоинтов в кабинете мерчанта Click. Click не списывает с сохранённой карты, поэтому подписка через Click продлевается вручную.

**Stripe — настоящий test mode** (Visa / Mastercard, USD). Способ появляется, когда задан ключ:

1. Создайте аккаунт на stripe.com и включите **Test mode**.
2. Скопируйте ключ `sk_test_…` из **Developers → API keys** в `STRIPE_SECRET_KEY`.
3. По желанию, для вебхуков: `stripe listen --forward-to localhost:3000/api/billing/stripe/webhook`, затем секрет `whsec_…` — в `STRIPE_WEBHOOK_SECRET`. Без CLI оплата всё равно подтверждается, когда пользователь возвращается из Checkout.
4. Тестовая карта: `4242 4242 4242 4242`, любая будущая дата, любой CVC. Отклоняемая карта: `4000 0000 0000 0002`.

Продукты и цены создаются автоматически, в Stripe Dashboard ничего настраивать не нужно. Отмена и смена карты — через Stripe Customer Portal.

**Автопродления** выполняются лениво, когда пользователь открывает приложение, а пакетно — через `POST /api/billing/renew` с заголовком `Authorization: Bearer $CRON_SECRET` (для внешнего cron) или кнопкой в админке.

### AI

Ключи задаются в `.env`: `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`. Работает любой набор.

- Роутер сам находит актуальные модели и сначала пробует быстрые. Медленные Pro-модели идут в конце.
- При ошибке, перегрузке или таймауте он незаметно переходит к следующей модели.
- Если недоступны все модели, отвечает встроенный офлайн-репетитор, так что пользователь никогда не видит ошибку.

### Админка — `/admin`

- **Обзор** — статистика и последние платежи.
- **Пользователи** — тариф, уровень, сброс лимита, «войти как», удаление.
- **Подписки** — подписки и счета; инструменты для проверки: «перемотать к концу периода / льготы», «запустить продления», возврат, выдать тариф на N дней.
- **AI-модели** — цепочка фолбэка, модели на паузе, тестовый запрос, журнал вызовов.
- **Темы** — какие темы доступны только в Pro.
- **Параметры** — лимиты и цены каждого тарифа, скидки, пробный и льготный период, офлайн-режим, порядок провайдеров.

### Стек

Next.js 15 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Framer Motion · Prisma + SQLite · next-intl · Stripe · Web Speech API.
