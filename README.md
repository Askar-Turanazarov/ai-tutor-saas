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

| Role  | Email               |
|-------|---------------------|
| Admin | `admin@ustoz.local` |
| Free  | `free@ustoz.local`  |
| Pro   | `pro@ustoz.local`   |
| Pro, paid, ends in 2 days | `sub@ustoz.local` |

### Plans

- **Free** — levels A1–A2, a daily time limit (15 minutes by default, resets at midnight Tashkent time), simple mistake review.
- **Pro** — all levels and topics, unlimited time, detailed mistake review (rule + examples), pronunciation coach, personal plan with quizzes.

Pro is sold for 1, 3 or 12 months (prices are in admin settings). Pro granted by an admin has no end date.

### Payments (test mode)

**Click** works out of the box (`CLICK_MODE="emulator"`). The built-in Click page sends real signed Prepare/Complete callbacks to `/api/payments/click/*`.

| Card | Result |
|------|--------|
| `8600 0000 0000 0001`, `9860 0000 0000 0001` | success |
| `8600 0000 0000 0002` | insufficient funds |

Any future expiry date works, and the SMS code is `666666`. For a real Click test merchant, set `CLICK_MODE="live"` and fill in the `CLICK_*` variables.

**Stripe** is hidden until `STRIPE_SECRET_KEY` (`sk_test_…`) is set. It charges in UZS. To receive webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/payments/stripe/webhook
```

Put the `whsec_…` secret it prints into `STRIPE_WEBHOOK_SECRET`. Test card `4242 4242 4242 4242` succeeds. `4000 0000 0000 0341` saves the card, but auto-renewal fails.

**Subscription lifecycle.** A scheduler runs every 5 minutes inside the server. In production, call `GET /api/cron/billing` with `Authorization: Bearer $CRON_SECRET`.

- **Before the end:** a reminder `billing.noticeDays` days ahead, in the app and by email.
- **Auto-renew** (the user's choice): a charge from the saved card 24 h before the end, retried up to 3 times.
- **At the end:** back to Free, with a notification.

Without `SMTP_URL`, emails are saved as `.eml` files in `.mail/`. In **Admin → Payments**, the "+2 min / −1 min" buttons let you test all of this without waiting.

**Fiscal receipts.** In Uzbekistan every payment needs a receipt registered with the OFD (soliq.uz), with an IKPU/MXIK code, a package code and 12% VAT.

- `FISCAL_PROVIDER="mock-ofd"` (default) issues TEST receipts with all the required fields, but nothing is sent to the tax office.
- `click-ofd` sends the items to Click (`ofd_data/submit_items`) and needs a live merchant.
- Stripe has no link to the UZ OFD and doesn't serve UZ legal entities. A foreign company plus your own virtual cash register would be needed.

### AI

Add keys to `.env`: `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`. Any combination works.

- The router discovers the current models on its own and tries the fast ones first. Slow Pro models go last.
- On an error, overload or timeout it quietly moves on to the next model.
- If every model is unavailable, a built-in offline tutor answers, so users never see an error.

### Admin panel — `/admin`

- **Overview** — stats and Pro requests.
- **Users** — plan, level, limit reset, "log in as", delete.
- **AI models** — fallback chain, paused models, a test request, call log.
- **Topics** — which topics are Pro-only.
- **Payments** — subscriptions, invoices, transactions, webhook log, receipts, a "run billing now" button.
- **Settings** — Free limit, offline mode, provider order, prices, payment providers, receipt details.

### Stack

Next.js 15 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Framer Motion · Prisma + SQLite · next-intl · Web Speech API.

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

| Rol   | Email               |
|-------|---------------------|
| Admin | `admin@ustoz.local` |
| Free  | `free@ustoz.local`  |
| Pro   | `pro@ustoz.local`   |
| Pro, toʻlangan, 2 kundan keyin tugaydi | `sub@ustoz.local` |

### Tariflar

- **Free** — A1–A2 darajalari, kunlik vaqt limiti (standart 15 daqiqa, Toshkent vaqti bilan yarim tunda yangilanadi), xatolarning oddiy tahlili.
- **Pro** — barcha darajalar va mavzular, cheksiz vaqt, xatolarning batafsil tahlili (qoida + misollar), talaffuz trenajyori, testlardan iborat shaxsiy reja.

Pro 1, 3 yoki 12 oyga sotiladi (narxlar admin sozlamalarida). Admin bergan Pro muddatsiz amal qiladi.

### Toʻlovlar (test rejimi)

**Click** darhol ishlaydi (`CLICK_MODE="emulator"`). Oʻrnatilgan Click sahifasi `/api/payments/click/*` manziliga haqiqiy imzoli Prepare/Complete soʻrovlarini yuboradi.

| Karta | Natija |
|-------|--------|
| `8600 0000 0000 0001`, `9860 0000 0000 0001` | muvaffaqiyatli |
| `8600 0000 0000 0002` | mablagʻ yetarli emas |

Istalgan kelgusi amal qilish muddati mos keladi, SMS kod `666666`. Haqiqiy Click test merchanti uchun `CLICK_MODE="live"` qoʻying va `CLICK_*` oʻzgaruvchilarini toʻldiring.

**Stripe** `STRIPE_SECRET_KEY` (`sk_test_…`) berilmaguncha yashirin. Toʻlov UZS da olinadi. Webhooklarni lokal qabul qilish uchun:

```bash
stripe listen --forward-to localhost:3000/api/payments/stripe/webhook
```

Chiqqan `whsec_…` kalitini `STRIPE_WEBHOOK_SECRET` ga yozing. `4242 4242 4242 4242` test kartasi muvaffaqiyatli oʻtadi. `4000 0000 0000 0341` kartani saqlaydi, lekin avto-yangilash muvaffaqiyatsiz boʻladi.

**Obuna muddati.** Rejalashtiruvchi server ichida har 5 daqiqada ishlaydi. Productionda `Authorization: Bearer $CRON_SECRET` bilan `GET /api/cron/billing` ni chaqiring.

- **Tugashidan oldin:** `billing.noticeDays` kun oldin ilovada va emailda eslatma.
- **Avto-yangilash** (foydalanuvchi tanlovi): tugashidan 24 soat oldin saqlangan kartadan yechiladi, 3 martagacha qayta urinadi.
- **Tugaganda:** Free ga qaytish va bildirishnoma.

`SMTP_URL` boʻlmasa, xatlar `.mail/` papkasiga `.eml` fayl sifatida saqlanadi. **Admin → Toʻlovlar** dagi "+2 daq / −1 daq" tugmalari bularning barchasini kutmasdan sinashga imkon beradi.

**Fiskal cheklar.** Oʻzbekistonda har bir toʻlov uchun OFD (soliq.uz) da roʻyxatdan oʻtgan chek kerak: IKPU/MXIK kodi, qadoq kodi va 12% QQS.

- `FISCAL_PROVIDER="mock-ofd"` (standart) barcha rekvizitlar bilan TEST cheklarini chiqaradi, lekin soliqqa hech narsa yuborilmaydi.
- `click-ofd` pozitsiyalarni Click ga (`ofd_data/submit_items`) yuboradi va haqiqiy merchant talab qiladi.
- Stripe UZ OFD bilan bogʻlanmagan va UZ yuridik shaxslariga xizmat koʻrsatmaydi. Xorijiy kompaniya va oʻz virtual kassangiz kerak boʻladi.

### AI

`.env` fayliga kalitlarni kiriting: `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`. Istalgan kombinatsiya ishlaydi.

- Router dolzarb modellarni oʻzi topadi va avval tezkorlarini sinaydi. Sekin Pro modellar oxirida turadi.
- Xato, yuklama yoki taymaut boʻlsa, sezdirmasdan keyingi modelga oʻtadi.
- Hech bir model ishlamasa, oʻrnatilgan oflayn ustoz javob beradi — foydalanuvchi hech qachon xato koʻrmaydi.

### Admin panel — `/admin`

- **Umumiy** — statistika va Pro soʻrovlari.
- **Foydalanuvchilar** — tarif, daraja, limitni tiklash, “sifatida kirish”, oʻchirish.
- **AI modellar** — zaxira zanjiri, pauzadagi modellar, test soʻrovi, chaqiruvlar jurnali.
- **Mavzular** — qaysi mavzular faqat Pro uchun.
- **Toʻlovlar** — obunalar, hisoblar, tranzaksiyalar, webhook jurnali, cheklar, “billingni hozir ishga tushirish” tugmasi.
- **Sozlamalar** — Free limiti, oflayn rejim, provayderlar tartibi, narxlar, toʻlov provayderlari, chek rekvizitlari.

### Texnologiyalar

Next.js 15 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Framer Motion · Prisma + SQLite · next-intl · Web Speech API.

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

| Роль  | Email               |
|-------|---------------------|
| Админ | `admin@ustoz.local` |
| Free  | `free@ustoz.local`  |
| Pro   | `pro@ustoz.local`   |
| Pro, оплачен, кончается через 2 дня | `sub@ustoz.local` |

### Тарифы

- **Free** — уровни A1–A2, дневной лимит времени (по умолчанию 15 минут, сброс в полночь по Ташкенту), простой разбор ошибок.
- **Pro** — все уровни и темы, без лимита, подробный разбор ошибок (правило + примеры), тренажёр произношения, персональный план с квизами.

Pro продаётся на 1, 3 или 12 месяцев (цены — в настройках админки). Pro, выданный админом, действует бессрочно.

### Оплата (тестовый режим)

**Click** работает сразу (`CLICK_MODE="emulator"`). Встроенная страница Click шлёт настоящие подписанные запросы Prepare/Complete на `/api/payments/click/*`.

| Карта | Результат |
|-------|-----------|
| `8600 0000 0000 0001`, `9860 0000 0000 0001` | успешно |
| `8600 0000 0000 0002` | недостаточно средств |

Подходит любой будущий срок действия, SMS-код `666666`. Для настоящего тестового мерчанта Click поставьте `CLICK_MODE="live"` и заполните переменные `CLICK_*`.

**Stripe** скрыт, пока не задан `STRIPE_SECRET_KEY` (`sk_test_…`). Оплата идёт в UZS. Чтобы локально получать webhook-и:

```bash
stripe listen --forward-to localhost:3000/api/payments/stripe/webhook
```

Выданный `whsec_…` впишите в `STRIPE_WEBHOOK_SECRET`. Тестовая карта `4242 4242 4242 4242` проходит. `4000 0000 0000 0341` сохраняется, но автопродление по ней не проходит.

**Срок подписки.** Планировщик запускается внутри сервера раз в 5 минут. В продакшене вызывайте `GET /api/cron/billing` с `Authorization: Bearer $CRON_SECRET`.

- **До окончания:** напоминание за `billing.noticeDays` дней в приложении и по почте.
- **Автопродление** (по выбору пользователя): списание с сохранённой карты за 24 ч до конца, до 3 попыток.
- **В момент окончания:** возврат на Free и уведомление.

Без `SMTP_URL` письма сохраняются как `.eml` в папку `.mail/`. В **Админка → Платежи** кнопки «+2 мин / −1 мин» позволяют проверить всё это без ожидания.

**Фискальные чеки.** В Узбекистане на каждую оплату нужен чек, зарегистрированный в ОФД (soliq.uz), с кодом ИКПУ/MXIK, кодом упаковки и НДС 12 %.

- `FISCAL_PROVIDER="mock-ofd"` (по умолчанию) выпускает ТЕСТОВЫЕ чеки со всеми реквизитами, но в налоговую ничего не отправляет.
- `click-ofd` передаёт позиции в Click (`ofd_data/submit_items`) и требует боевого мерчанта.
- Stripe не связан с ОФД Узбекистана и не работает с юрлицами РУз. Понадобятся зарубежная компания и собственная виртуальная касса.

### AI

Ключи задаются в `.env`: `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`. Работает любой набор.

- Роутер сам находит актуальные модели и сначала пробует быстрые. Медленные Pro-модели идут в конце.
- При ошибке, перегрузке или таймауте он незаметно переходит к следующей модели.
- Если недоступны все модели, отвечает встроенный офлайн-репетитор, так что пользователь никогда не видит ошибку.

### Админка — `/admin`

- **Обзор** — статистика и заявки на Pro.
- **Пользователи** — тариф, уровень, сброс лимита, «войти как», удаление.
- **AI-модели** — цепочка фолбэка, модели на паузе, тестовый запрос, журнал вызовов.
- **Темы** — какие темы доступны только в Pro.
- **Платежи** — подписки, счета, транзакции, журнал webhook-ов, чеки, кнопка «запустить биллинг сейчас».
- **Параметры** — лимит Free, офлайн-режим, порядок провайдеров, цены, платёжные провайдеры, реквизиты чека.

### Стек

Next.js 15 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Framer Motion · Prisma + SQLite · next-intl · Web Speech API.
