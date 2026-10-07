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
| Plus  | `sub@ustoz.local`   | Plus, ends in 2 days; renewal card is declined |

### Plans

| | Free | Plus | Pro |
|---|---|---|---|
| Levels | A1–A2 | A1–C2 | A1–C2 |
| Practice time per day | 15 min | 60 min | unlimited |
| Personal plan | — | ✓ | ✓ |
| Mistake review | short | detailed | detailed + alternatives |
| Pronunciation coach | — | 10 phrases a day | unlimited |
| Price per month | 0 | 49 000 UZS | 89 000 UZS |

- Periods: 1, 3 and 12 months (−10% and −25%).
- **Trial:** 7 days of Pro, once per account, no card needed.
- **Upgrade** Plus → Pro happens right away: you pay only the difference for the days left, and the renewal date stays the same.
- **Downgrade** and **cancellation** take effect at the end of the paid period.
- **Failed renewal:** the subscription goes to `past_due`, access stays for a 3-day grace period, then the account returns to Free.
- Limits reset at midnight Tashkent time. Admins can change all limits, prices, discounts, trial and grace length in **Settings**.

### Payments

The **Plans** page (`/app/plans`) opens the checkout. Subscription, invoices, receipts and saved cards are on `/app/billing`. All prices are in UZS. There are three payment methods; every one goes through the same layer (`src/lib/billing/providers`), and admins can switch each of them off in **Settings**.

**Uzcard / HUMO — full emulation.** No real card, SMS or money is involved. Any 16-digit number works: 9860… is HUMO, anything else is Uzcard. Any 6-digit SMS code works (a test code is shown on screen). Test numbers:

- ending in `0000` — the bank declines the payment;
- ending in `1111` — the first payment succeeds, but the automatic renewal is declined (use it to test `past_due`).

**How Uzcard/HUMO work in real life.** A merchant can't connect to the Uzcard or HUMO processing directly. You sign a contract with an aggregator (Payme, Click, Atmos, Uzum…), and it gives you an API:

1. Card number and expiry date are sent to the aggregator, never stored by the merchant.
2. The bank sends an SMS code to the card owner's phone; the code confirms the card.
3. The aggregator returns a **token**. The merchant keeps only the token and the last 4 digits.
4. Payments, including monthly renewals, are charged by token without the card owner.

The emulator follows exactly these steps (`card-mock.ts`). For production, the mock is replaced by the aggregator's API calls.

**Click — SHOP API emulator.** With `CLICK_MODE="emulator"` (the default) the checkout opens a page that plays my.click.uz: card → SMS code → payment.

| Card | Result |
|------|--------|
| `8600 0000 0000 0001`, `9860 0000 0000 0001` | success |
| `8600 0000 0000 0002` | insufficient funds (also on renewals) |

Any future expiry date works, and the SMS code is `666666`. The server then calls our own `/api/payments/click/prepare` and `/complete` endpoints over HTTP with the same signed requests Click sends (MD5 `sign_string`, error codes, idempotency). With **Save card** on, the card is tokenized (`card_token`) and renewals are charged by token. Quick checks: a wrong signature returns `-1`, a wrong amount `-2`, a repeated Complete `-4`.

To go live, set `CLICK_MODE="live"`, `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_MERCHANT_USER_ID` and `CLICK_SECRET_KEY`, and enter the Prepare/Complete URLs in the Click merchant cabinet.

**Stripe — real test mode** (Visa / Mastercard, charged in UZS). The option appears once a key is set:

1. Create an account at stripe.com and switch to **Test mode**.
2. Copy the `sk_test_…` key from **Developers → API keys** to `STRIPE_SECRET_KEY`.
3. Run `npm run stripe:listen` (needs the [Stripe CLI](https://stripe.com/docs/stripe-cli)). It forwards webhooks to `/api/payments/stripe/webhook` and prints the `whsec_…` secret for `STRIPE_WEBHOOK_SECRET`. Without it, the payment is still confirmed when the user returns from Checkout.
4. Test cards (any future date, any CVC): `4242 4242 4242 4242` succeeds; `4000 0000 0000 0341` can be saved, but later charges fail (for testing a failed renewal); `4000 0000 0000 0002` is declined.

Checkout saves the card (`setup_future_usage`), and renewals are charged off-session by our own billing job, the same way as for the other methods. Nothing needs to be set up in the Stripe Dashboard.

**Renewals, reminders, notifications.** Locally the billing job runs every 5 minutes inside the server (`src/instrumentation.ts`; `BILLING_TIMER="off"` disables it). On Vercel the timer is off and Vercel Cron calls the job once a day at 05:00 UTC (`vercel.json`); access still switches exactly on time, because every request checks the subscription. It can also be called via `GET /api/cron/billing` with `Authorization: Bearer $CRON_SECRET` (for an external cron), or with the button in the admin panel. The job:

- charges the saved card from 48 hours before the period ends: one try 1–2 days before, one on the last day, then once a day during the grace period (tries at least 20 hours apart, so a daily cron is enough);
- sends a reminder no later than `billing.noticeDays` days before the end (3 by default), saying whether the card will be charged, and, if nothing will renew it, an “ends today/tomorrow at HH:MM” notice on the last run;
- moves an unpaid subscription to `past_due` and later back to Free, with a notification;
- cancels checkouts abandoned for a day and retries fiscal receipts.

Notifications appear under the bell in the app and on the **Today** banner, and are sent by email and, if it is linked, to Telegram (see below). In **Admin → Subscriptions**, the "in 2 days / in 2 min / a minute ago" buttons let you try the whole cycle right away.

**Fiscal receipts.** In Uzbekistan every payment needs a receipt registered with the OFD (soliq.uz). Each paid invoice gets a printable receipt with a QR code at `/app/billing/receipt/…`. It shows the MXIK code, package code, 12% VAT, seller name and TIN (set in **Settings**).

- `FISCAL_PROVIDER="mock-ofd"` (default) issues receipts marked TEST; nothing is sent to the tax office.
- `click-ofd` sends Click payments to the OFD (`ofd_data/submit_items`) and needs a live merchant.
- `none` turns receipts off.

### Account

- Sign-up sends a confirmation email (the link works for 24 hours). Until the email is confirmed, the app shows a banner with **Send again**, and payments are unavailable. Demo accounts are already confirmed.
- **Forgot password?** on the login page sends a one-time link (60 minutes). Setting a new password signs out all other sessions.
- **Settings:** phone number (optional), Telegram, and **Emails from Ustoz (demo)** — the emails sent to this account.
- Public offer and privacy policy: `/legal/offer` and `/legal/privacy`, in all three languages. They are a study version: the company and its details are fictional. Sign-up and payment record that the user accepted them.

### Email

Every email and Telegram message is saved to the outbox (**Admin → Outbox**). With `SMTP_URL` (for example `smtps://user:pass@smtp.example.com:465`) and `MAIL_FROM`, emails are really sent. Without them the app works in emulation mode: nothing is delivered, and each user can read their own emails in **Settings**.

### Telegram

Users link Telegram in **Settings** and then get the same notifications in the bot, with an **Open** button.

- **Without a bot** (no `TELEGRAM_BOT_TOKEN`): **Connect** opens a bot emulator in the app (`/app/settings/telegram`) with Start and **Share contact** buttons and the bot's messages.
- **Real bot:** create it with [@BotFather](https://t.me/BotFather) and set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` and `TELEGRAM_WEBHOOK_SECRET`. Locally, run `npm run tg:poll` next to `npm run dev`: it fetches updates from Telegram and forwards them to the local webhook. **Connect** opens `t.me/<bot>?start=<code>` (a one-time code for 15 minutes); the bot then asks for the phone number and compares it with the profile.
- **Mini App** (`/tg`): profile, plan, invoices with receipts and notifications, inside Telegram. It signs in with Telegram's `initData` (HMAC check). Locally, `/en/tg?dev=1` opens it in a normal browser with the current site session. A real Mini App needs HTTPS, so it works after deployment: `npm run tg:setup` sets the webhook, commands and menu button for `APP_URL`.

### Tests

```bash
npm test                  # Vitest, a separate prisma/test.db; dev.db is not touched
npx tsc --noEmit && npm run lint
```

The tests cover learning, exercises, XP and leagues, prices and payments, the whole billing cycle day by day, Click signatures, the Stripe webhook, email, password reset, Telegram and the legal pages. GitHub Actions (`.github/workflows/ci.yml`) runs the type check, lint, tests and build on every push.

### Deploying to Vercel + Neon

Locally the app keeps using SQLite. For Vercel, `npm run db:pg:schema` generates the Postgres schema `prisma/postgres/schema.prisma` from `prisma/schema.prisma`, and `prisma/postgres/migrations` holds its migrations. CI fails if the generated schema is out of date.

1. Create a project at [neon.tech](https://neon.tech) and copy two connection strings: the **pooled** one (host with `-pooler`) and the **direct** one.
2. Put them into `.env.neon` as `DATABASE_URL` (pooled) and `DIRECT_URL` (direct), then run `npm run db:pg:seed`: it applies the migrations and fills the database with the demo data. The file is ignored by git.
3. Import the repository into [Vercel](https://vercel.com). The `vercel-build` script applies new migrations and builds the app.
4. Set the environment variables: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `APP_URL` (the production URL), `CRON_SECRET`, plus AI, Stripe, Click, SMTP and Telegram keys as needed (see `.env.example`).
5. After deploying: add the Stripe webhook `https://<domain>/api/payments/stripe/webhook`, run `npm run tg:setup` with the production `APP_URL`, and enter the Click URLs in the merchant cabinet.

If the pooled connection fails with "prepared statement … already exists", add `&pgbouncer=true` to `DATABASE_URL`. To change the schema later: edit `prisma/schema.prisma` → `npm run db:push` (local) → `npm run db:pg:diff <name>` → review the SQL and commit; Vercel applies it on the next deploy.

### AI

Add keys to `.env`: `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`. Any combination works.

- The router discovers the current models on its own and tries the fast ones first. Slow Pro models go last.
- On an error, overload or timeout it quietly moves on to the next model.
- If every model is unavailable, a built-in offline tutor answers, so users never see an error.

### Admin panel — `/admin`

- **Overview** — stats and recent payments.
- **Users** — plan, level, limit reset, "log in as", delete.
- **Subscriptions** — revenue for 30 days, subscriptions, invoices, transactions, webhooks and receipts (with retry); test tools: "run the billing cycle", move the period end, "fast-forward to the period end / grace end", refunds, grant a plan for N days or forever.
- **AI models** — fallback chain, paused models, a test request, call log.
- **Topics** — which topics are Pro-only.
- **Outbox** — emails and Telegram messages, with a preview.
- **Settings** — limits and prices of every plan, discounts, trial and grace length, payment methods, reminder timing, receipt data, offline mode, provider order.

### Stack

Next.js 15 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Framer Motion · Prisma + SQLite / Neon Postgres · Vitest · next-intl · Stripe · Web Speech API.

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
| Plus  | `sub@ustoz.local`   | Plus, 2 kundan keyin tugaydi; uzaytirishda karta rad etiladi |

### Tariflar

| | Free | Plus | Pro |
|---|---|---|---|
| Darajalar | A1–A2 | A1–C2 | A1–C2 |
| Kunlik mashgʻulot vaqti | 15 daq | 60 daq | cheksiz |
| Shaxsiy reja | — | ✓ | ✓ |
| Xatolar tahlili | qisqa | batafsil | batafsil + muqobillar |
| Talaffuz trenajyori | — | kuniga 10 ibora | cheksiz |
| Oylik narx | 0 | 49 000 soʻm | 89 000 soʻm |

- Davrlar: 1, 3 va 12 oy (−10% va −25%).
- **Sinov davri:** 7 kun Pro, har bir hisob uchun bir marta, kartasiz.
- **Plus → Pro ga oʻtish** darhol: faqat qolgan kunlar uchun farq toʻlanadi, uzaytirish sanasi oʻzgarmaydi.
- **Arzonroq tarifga oʻtish** va **bekor qilish** toʻlangan davr oxirida kuchga kiradi.
- **Uzaytirish muvaffaqiyatsiz boʻlsa:** obuna `past_due` holatiga oʻtadi, kirish 3 kunlik imtiyozli davrda saqlanadi, soʻng hisob Free ga qaytadi.
- Limitlar Toshkent vaqti bilan yarim tunda yangilanadi. Barcha limitlar, narxlar, chegirmalar, sinov va imtiyozli davr uzunligi admin panelning **Sozlamalar** boʻlimida oʻzgartiriladi.

### Toʻlovlar

**Tariflar** sahifasi (`/app/plans`) toʻlovni ochadi. Obuna, hisob-fakturalar, cheklar va saqlangan kartalar — `/app/billing` da. Barcha narxlar soʻmda. Toʻlovning uchta usuli bor, barchasi bitta qatlam orqali ishlaydi (`src/lib/billing/providers`), har birini admin **Sozlamalar** boʻlimida oʻchirishi mumkin.

**Uzcard / HUMO — toʻliq emulyatsiya.** Haqiqiy karta, SMS va pul ishlatilmaydi. Istalgan 16 xonali raqam qabul qilinadi: 9860… — HUMO, qolganlari — Uzcard. Istalgan 6 xonali SMS-kod mos keladi (test kodi ekranda koʻrsatiladi). Test raqamlari:

- `0000` bilan tugasa — bank toʻlovni rad etadi;
- `1111` bilan tugasa — birinchi toʻlov oʻtadi, avtomatik uzaytirish rad etiladi (`past_due` ni tekshirish uchun).

**Uzcard/HUMO haqiqatda qanday ishlaydi.** Sotuvchi Uzcard yoki HUMO protsessingiga toʻgʻridan-toʻgʻri ulana olmaydi. Agregator (Payme, Click, Atmos, Uzum…) bilan shartnoma tuziladi, u API beradi:

1. Karta raqami va amal qilish muddati agregatorga yuboriladi, sotuvchida saqlanmaydi.
2. Bank karta egasining telefoniga SMS-kod yuboradi, kod kartani tasdiqlaydi.
3. Agregator **token** qaytaradi. Sotuvchi faqat token va oxirgi 4 raqamni saqlaydi.
4. Toʻlovlar, jumladan oylik uzaytirishlar, karta egasisiz token boʻyicha yechiladi.

Emulyator aynan shu bosqichlarni takrorlaydi (`card-mock.ts`). Production uchun mock agregator API chaqiruvlariga almashtiriladi.

**Click — SHOP API emulyatori.** `CLICK_MODE="emulator"` (standart) boʻlsa, toʻlov my.click.uz oʻrnini bosuvchi sahifani ochadi: karta → SMS-kod → toʻlov.

| Karta | Natija |
|-------|--------|
| `8600 0000 0000 0001`, `9860 0000 0000 0001` | muvaffaqiyatli |
| `8600 0000 0000 0002` | mablagʻ yetarli emas (uzaytirishda ham) |

Istalgan kelajakdagi muddat mos keladi, SMS-kod — `666666`. Soʻng server Click yuboradigan imzolangan soʻrovlarni (MD5 `sign_string`, xato kodlari, idempotentlik) HTTP orqali bizning `/api/payments/click/prepare` va `/complete` endpointlarimizga yuboradi. **Kartani saqlash** yoqilgan boʻlsa, karta tokenlashtiriladi (`card_token`) va uzaytirishlar token boʻyicha yechiladi. Tez tekshiruv: notoʻgʻri imzo — `-1`, notoʻgʻri summa — `-2`, takroriy Complete — `-4`.

Haqiqiy rejimga oʻtish uchun `CLICK_MODE="live"`, `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_MERCHANT_USER_ID` va `CLICK_SECRET_KEY` ni kiriting hamda Prepare/Complete manzillarini Click merchant kabinetida koʻrsating.

**Stripe — haqiqiy test rejimi** (Visa / Mastercard, soʻmda yechiladi). Kalit kiritilgach, usul paydo boʻladi:

1. stripe.com da hisob yarating va **Test mode** ga oʻting.
2. **Developers → API keys** dagi `sk_test_…` kalitini `STRIPE_SECRET_KEY` ga yozing.
3. `npm run stripe:listen` ni ishga tushiring ([Stripe CLI](https://stripe.com/docs/stripe-cli) kerak). U webhooklarni `/api/payments/stripe/webhook` ga yoʻnaltiradi va `STRIPE_WEBHOOK_SECRET` uchun `whsec_…` sirini chiqaradi. Usiz ham toʻlov foydalanuvchi Checkout dan qaytganda tasdiqlanadi.
4. Test kartalari (istalgan kelajakdagi sana, istalgan CVC): `4242 4242 4242 4242` — muvaffaqiyatli; `4000 0000 0000 0341` — saqlanadi, lekin keyingi yechimlar rad etiladi (muvaffaqiyatsiz uzaytirishni tekshirish uchun); `4000 0000 0000 0002` — rad etiladi.

Checkout kartani saqlaydi (`setup_future_usage`), uzaytirishlarni esa boshqa usullardagi kabi oʻzimizning billing jarayonimiz off-session yechadi. Stripe Dashboard da hech narsa sozlash shart emas.

**Uzaytirish, eslatmalar, bildirishnomalar.** Lokal muhitda billing jarayoni server ichida har 5 daqiqada ishlaydi (`src/instrumentation.ts`; `BILLING_TIMER="off"` uni oʻchiradi). Vercelʼda taymer oʻchiq, jarayonni Vercel Cron kuniga bir marta 05:00 UTC da chaqiradi (`vercel.json`); kirish huquqi baribir aynan oʻz vaqtida oʻzgaradi, chunki har bir soʻrov obunani tekshiradi. Uni `Authorization: Bearer $CRON_SECRET` bilan `GET /api/cron/billing` orqali (tashqi cron uchun) yoki admin paneldagi tugma bilan ham chaqirish mumkin. Jarayon:

- davr tugashidan 48 soat oldin saqlangan kartadan yechadi: 1–2 kun oldin bir urinish, oxirgi kuni bir urinish, soʻng imtiyozli davrda kuniga bir marta (urinishlar orasi kamida 20 soat, shuning uchun kuniga bir marta cron yetarli);
- tugashdan eng kechi bilan `billing.noticeDays` kun oldin (standart 3) eslatma yuboradi, unda kartadan yechilishi yoki yechilmasligi aytiladi; hech narsa uzaytirmasa, oxirgi ishga tushishda «bugun/ertaga soat HH:MM da tugaydi» xabari keladi;
- toʻlanmagan obunani `past_due` ga, keyin Free ga oʻtkazadi va xabar beradi;
- bir kun tashlab ketilgan toʻlovlarni bekor qiladi va fiskal cheklarni qayta yuboradi.

Bildirishnomalar ilovadagi qoʻngʻiroqcha ostida va **Bugun** banerida koʻrinadi hamda emailga va, ulangan boʻlsa, Telegramga yuboriladi (pastga qarang). **Admin → Obunalar** dagi “2 kundan keyin / 2 daqiqadan keyin / bir daqiqa oldin” tugmalari butun siklni darhol sinab koʻrish imkonini beradi.

**Fiskal cheklar.** Oʻzbekistonda har bir toʻlov uchun OFD (soliq.uz) da roʻyxatdan oʻtgan chek kerak. Har bir toʻlangan hisob uchun `/app/billing/receipt/…` da QR-kodli, chop etsa boʻladigan chek yaratiladi. Unda MXIK, qadoq kodi, 12% QQS, sotuvchi nomi va STIR (**Sozlamalar** da) koʻrsatiladi.

- `FISCAL_PROVIDER="mock-ofd"` (standart) TEST belgili cheklar beradi, soliq idorasiga hech narsa yuborilmaydi.
- `click-ofd` Click toʻlovlarini OFD ga yuboradi (`ofd_data/submit_items`), haqiqiy merchant kerak.
- `none` cheklarni oʻchiradi.

### Hisob

- Roʻyxatdan oʻtgach, tasdiqlash xati yuboriladi (havola 24 soat amal qiladi). Email tasdiqlanmaguncha ilovada **Yana yuborish** tugmali banner koʻrinadi va toʻlov mavjud emas. Demo hisoblar allaqachon tasdiqlangan.
- Kirish sahifasidagi **Parolni unutdingizmi?** bir martalik havola yuboradi (60 daqiqa). Yangi parol oʻrnatilgach, boshqa barcha seanslar yopiladi.
- **Sozlamalar:** telefon raqami (ixtiyoriy), Telegram va **Ustoz xatlari (demo)** — shu hisobga yuborilgan xatlar.
- Ommaviy oferta va maxfiylik siyosati: `/legal/offer` va `/legal/privacy`, uchala tilda. Bular oʻquv versiyasi: kompaniya va uning rekvizitlari oʻylab topilgan. Roʻyxatdan oʻtish va toʻlovda foydalanuvchi ularni qabul qilgani qayd etiladi.

### Pochta

Har bir xat va Telegram xabari chiquvchi xabarlarga saqlanadi (**Admin → Chiquvchi**). `SMTP_URL` (masalan, `smtps://user:pass@smtp.example.com:465`) va `MAIL_FROM` boʻlsa, xatlar haqiqatan yuboriladi. Ular boʻlmasa, ilova emulyatsiya rejimida ishlaydi: hech narsa yetkazilmaydi, har bir foydalanuvchi oʻz xatlarini **Sozlamalar**da oʻqiy oladi.

### Telegram

Foydalanuvchi Telegramni **Sozlamalar**da ulaydi va keyin oʻsha bildirishnomalarni botda **Ochish** tugmasi bilan oladi.

- **Botsiz** (`TELEGRAM_BOT_TOKEN` yoʻq): **Ulash** ilova ichida bot emulyatorini ochadi (`/app/settings/telegram`) — Start va **Kontaktni ulashish** tugmalari hamda bot xabarlari bilan.
- **Haqiqiy bot:** [@BotFather](https://t.me/BotFather) orqali yarating va `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` ni kiriting. Lokal muhitda `npm run dev` yonida `npm run tg:poll` ni ishga tushiring: u Telegramdan yangilanishlarni olib, lokal webhookka uzatadi. **Ulash** `t.me/<bot>?start=<kod>` ni ochadi (15 daqiqalik bir martalik kod); soʻng bot telefon raqamini soʻraydi va profildagisi bilan solishtiradi.
- **Mini App** (`/tg`): Telegram ichida profil, tarif, cheklar bilan hisob-fakturalar va bildirishnomalar. Telegramning `initData` si orqali kiradi (HMAC tekshiruvi). Lokal muhitda `/uz/tg?dev=1` uni oddiy brauzerda joriy sayt seansi bilan ochadi. Haqiqiy Mini App HTTPS talab qiladi, shuning uchun deploydan keyin ishlaydi: `npm run tg:setup` `APP_URL` uchun webhook, buyruqlar va menyu tugmasini oʻrnatadi.

### Testlar

```bash
npm test                  # Vitest, alohida prisma/test.db; dev.db ga tegilmaydi
npx tsc --noEmit && npm run lint
```

Testlar oʻqish, mashqlar, XP va ligalar, narxlar va toʻlovlar, kunma-kun butun billing sikli, Click imzolari, Stripe webhooki, pochta, parolni tiklash, Telegram va huquqiy sahifalarni qamraydi. GitHub Actions (`.github/workflows/ci.yml`) har bir pushda tiplar tekshiruvi, lint, testlar va buildni ishga tushiradi.

### Vercel + Neon ga deploy

Lokal muhitda ilova SQLite bilan ishlashda davom etadi. Vercel uchun `npm run db:pg:schema` `prisma/schema.prisma` dan Postgres sxemasini (`prisma/postgres/schema.prisma`) yaratadi, uning migratsiyalari `prisma/postgres/migrations` da. Yaratilgan sxema eskirgan boʻlsa, CI xato beradi.

1. [neon.tech](https://neon.tech) da loyiha yarating va ikki ulanish satrini oling: **pooled** (hostida `-pooler` bor) va **direct**.
2. Ularni `.env.neon` ga `DATABASE_URL` (pooled) va `DIRECT_URL` (direct) sifatida yozing, soʻng `npm run db:pg:seed` ni ishga tushiring: u migratsiyalarni qoʻllaydi va bazani demo maʼlumotlar bilan toʻldiradi. Fayl gitga tushmaydi.
3. Repozitoriyni [Vercel](https://vercel.com) ga import qiling. `vercel-build` skripti yangi migratsiyalarni qoʻllaydi va ilovani yigʻadi.
4. Muhit oʻzgaruvchilari: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `APP_URL` (prod manzil), `CRON_SECRET`, kerak boʻlsa AI, Stripe, Click, SMTP va Telegram kalitlari (`.env.example` ga qarang).
5. Deploydan keyin: Stripe webhookini `https://<domen>/api/payments/stripe/webhook` ga qoʻshing, prod `APP_URL` bilan `npm run tg:setup` ni ishga tushiring va Click URL manzillarini merchant kabinetiga kiriting.

Agar pooled ulanish “prepared statement … already exists” xatosini bersa, `DATABASE_URL` oxiriga `&pgbouncer=true` qoʻshing. Keyinchalik sxemani oʻzgartirish: `prisma/schema.prisma` ni tahrirlang → `npm run db:push` (lokal) → `npm run db:pg:diff <nom>` → SQLni tekshirib, commit qiling; Vercel uni keyingi deployda qoʻllaydi.

### AI

`.env` fayliga kalitlarni kiriting: `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`. Istalgan kombinatsiya ishlaydi.

- Router dolzarb modellarni oʻzi topadi va avval tezkorlarini sinaydi. Sekin Pro modellar oxirida turadi.
- Xato, yuklama yoki taymaut boʻlsa, sezdirmasdan keyingi modelga oʻtadi.
- Hech bir model ishlamasa, oʻrnatilgan oflayn ustoz javob beradi — foydalanuvchi hech qachon xato koʻrmaydi.

### Admin panel — `/admin`

- **Umumiy** — statistika va soʻnggi toʻlovlar.
- **Foydalanuvchilar** — tarif, daraja, limitni tiklash, “sifatida kirish”, oʻchirish.
- **Obunalar** — 30 kunlik tushum, obunalar, hisob-fakturalar, tranzaksiyalar, webhooklar va cheklar (qayta urinish bilan); test vositalari: “billing siklini ishga tushirish”, muddat oxirini koʻchirish, “davr / imtiyoz oxiriga oʻtkazish”, qaytarish, N kunga yoki muddatsiz tarif berish.
- **AI modellar** — zaxira zanjiri, pauzadagi modellar, test soʻrovi, chaqiruvlar jurnali.
- **Mavzular** — qaysi mavzular faqat Pro uchun.
- **Chiquvchi** — xatlar va Telegram xabarlari, koʻrib chiqish bilan.
- **Sozlamalar** — har bir tarifning limitlari va narxlari, chegirmalar, sinov va imtiyozli davr, toʻlov usullari, eslatma muddati, chek rekvizitlari, oflayn rejim, provayderlar tartibi.

### Texnologiyalar

Next.js 15 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Framer Motion · Prisma + SQLite / Neon Postgres · Vitest · next-intl · Stripe · Web Speech API.

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
| Plus  | `sub@ustoz.local`   | Plus, заканчивается через 2 дня; карта при продлении отклоняется |

### Тарифы

| | Free | Plus | Pro |
|---|---|---|---|
| Уровни | A1–A2 | A1–C2 | A1–C2 |
| Время практики в день | 15 мин | 60 мин | без лимита |
| Персональный план | — | ✓ | ✓ |
| Разбор ошибок | краткий | подробный | подробный + альтернативы |
| Тренажёр произношения | — | 10 фраз в день | без лимита |
| Цена в месяц | 0 | 49 000 сум | 89 000 сум |

- Периоды: 1, 3 и 12 месяцев (−10% и −25%).
- **Пробный период:** 7 дней Pro, один раз на аккаунт, без карты.
- **Повышение** Plus → Pro — сразу: доплачивается только разница за оставшиеся дни, дата продления не меняется.
- **Понижение** и **отмена** вступают в силу в конце оплаченного периода.
- **Неудачное продление:** подписка переходит в `past_due`, доступ сохраняется на 3 дня льготного периода, затем аккаунт возвращается на Free.
- Лимиты сбрасываются в полночь по Ташкенту. Все лимиты, цены, скидки, длина пробного и льготного периода меняются в админке в **«Параметрах»**.

### Оплата

Страница **«Тарифы»** (`/app/plans`) открывает оформление. Подписка, счета, чеки и сохранённые карты — на `/app/billing`. Все цены в сумах. Способов оплаты три, все работают через один слой (`src/lib/billing/providers`), любой из них админ может выключить в **«Параметрах»**.

**Uzcard / HUMO — полная эмуляция.** Настоящая карта, SMS и деньги не используются. Принимается любой 16-значный номер: 9860… — HUMO, остальные — Uzcard. Подходит любой 6-значный SMS-код (тестовый код показан на экране). Тестовые номера:

- на `0000` — банк отклоняет оплату;
- на `1111` — первая оплата проходит, а автопродление отклоняется (для проверки `past_due`).

**Как Uzcard/HUMO работают на самом деле.** Магазин не может подключиться к процессингу Uzcard или HUMO напрямую. Заключается договор с агрегатором (Payme, Click, Atmos, Uzum…), и он даёт API:

1. Номер карты и срок действия уходят агрегатору, магазин их не хранит.
2. Банк отправляет SMS-код на телефон владельца карты, код подтверждает карту.
3. Агрегатор возвращает **токен**. Магазин хранит только токен и последние 4 цифры.
4. Платежи, в том числе ежемесячные продления, списываются по токену без участия владельца карты.

Эмулятор повторяет ровно эти шаги (`card-mock.ts`). Для продакшена мок заменяется вызовами API агрегатора.

**Click — эмулятор SHOP API.** При `CLICK_MODE="emulator"` (по умолчанию) оформление открывает страницу вместо my.click.uz: карта → SMS-код → оплата.

| Карта | Результат |
|-------|-----------|
| `8600 0000 0000 0001`, `9860 0000 0000 0001` | успешно |
| `8600 0000 0000 0002` | недостаточно средств (и при продлении) |

Подходит любой будущий срок действия, SMS-код — `666666`. Затем сервер шлёт по HTTP на наши эндпоинты `/api/payments/click/prepare` и `/complete` такие же подписанные запросы, как Click (MD5 `sign_string`, коды ошибок, идемпотентность). Если включено **«Сохранить карту»**, карта токенизируется (`card_token`), и продления списываются по токену. Быстрая проверка: неверная подпись — `-1`, неверная сумма — `-2`, повторный Complete — `-4`.

Чтобы перейти на настоящий Click, задайте `CLICK_MODE="live"`, `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_MERCHANT_USER_ID`, `CLICK_SECRET_KEY` и укажите адреса Prepare/Complete в кабинете мерчанта Click.

**Stripe — настоящий test mode** (Visa / Mastercard, списание в сумах). Способ появляется, когда задан ключ:

1. Создайте аккаунт на stripe.com и включите **Test mode**.
2. Скопируйте ключ `sk_test_…` из **Developers → API keys** в `STRIPE_SECRET_KEY`.
3. Запустите `npm run stripe:listen` (нужен [Stripe CLI](https://stripe.com/docs/stripe-cli)). Он пересылает вебхуки на `/api/payments/stripe/webhook` и печатает секрет `whsec_…` для `STRIPE_WEBHOOK_SECRET`. Без него оплата всё равно подтверждается, когда пользователь возвращается из Checkout.
4. Тестовые карты (любая будущая дата, любой CVC): `4242 4242 4242 4242` — успешно; `4000 0000 0000 0341` — сохраняется, но последующие списания отклоняются (для проверки неудачного продления); `4000 0000 0000 0002` — отклоняется.

Checkout сохраняет карту (`setup_future_usage`), а продления списывает off-session наш собственный биллинг, так же как для остальных способов. В Stripe Dashboard ничего настраивать не нужно.

**Продления, напоминания, уведомления.** Локально биллинг запускается внутри сервера раз в 5 минут (`src/instrumentation.ts`; `BILLING_TIMER="off"` выключает его). На Vercel таймер выключен, и биллинг раз в сутки в 05:00 UTC вызывает Vercel Cron (`vercel.json`); доступ при этом всё равно переключается точно в срок, потому что каждый запрос проверяет подписку. Его также можно вызвать через `GET /api/cron/billing` с заголовком `Authorization: Bearer $CRON_SECRET` (для внешнего cron) или кнопкой в админке. Биллинг:

- списывает с сохранённой карты начиная за 48 часов до конца периода: попытка за 1–2 дня, попытка в последний день, потом раз в день в льготный период (попытки не чаще раза в 20 часов, поэтому хватает cron раз в сутки);
- не позже чем за `billing.noticeDays` дней до конца (по умолчанию 3) присылает напоминание, где сказано, спишется ли оплата с карты; если продлевать нечем — на последнем запуске сообщение «закончится сегодня/завтра в ЧЧ:ММ»;
- переводит неоплаченную подписку в `past_due`, а затем на Free, с уведомлением;
- отменяет оформления, брошенные на сутки, и повторяет фискализацию чеков.

Уведомления видны под колокольчиком в приложении и на баннере **«Сегодня»**, а также приходят на почту и, если он привязан, в Telegram (см. ниже). В **Админке → Подписки** кнопки «через 2 дня / через 2 мин / минуту назад» позволяют сразу пройти весь цикл.

**Фискальные чеки.** В Узбекистане на каждый платёж нужен чек, зарегистрированный в ОФД (soliq.uz). На каждый оплаченный счёт создаётся чек с QR-кодом для печати: `/app/billing/receipt/…`. В нём указаны ИКПУ (MXIK), код упаковки, НДС 12 %, продавец и ИНН (задаются в **«Параметрах»**).

- `FISCAL_PROVIDER="mock-ofd"` (по умолчанию) выдаёт чеки с пометкой ТЕСТОВЫЙ, в налоговую ничего не уходит.
- `click-ofd` отправляет платежи Click в ОФД (`ofd_data/submit_items`), нужен боевой мерчант.
- `none` выключает чеки.

### Аккаунт

- После регистрации приходит письмо для подтверждения почты (ссылка действует 24 часа). Пока почта не подтверждена, в приложении виден баннер с кнопкой **«Отправить ещё раз»**, а оплата недоступна. Демо-аккаунты уже подтверждены.
- **«Забыли пароль?»** на странице входа присылает одноразовую ссылку (60 минут). После смены пароля все остальные сессии закрываются.
- **Настройки:** телефон (необязательно), Telegram и **«Письма от Ustoz (демо)»** — письма, отправленные этому аккаунту.
- Публичная оферта и политика конфиденциальности: `/legal/offer` и `/legal/privacy`, на трёх языках. Это учебная версия: компания и реквизиты вымышлены. При регистрации и оплате записывается, что пользователь их принял.

### Почта

Каждое письмо и сообщение в Telegram сохраняется в исходящих (**Админка → Исходящие**). С `SMTP_URL` (например, `smtps://user:pass@smtp.example.com:465`) и `MAIL_FROM` письма действительно отправляются. Без них работает эмуляция: ничего не доставляется, а каждый пользователь видит свои письма в **«Настройках»**.

### Telegram

Пользователь привязывает Telegram в **«Настройках»** и получает в боте те же уведомления с кнопкой **«Открыть»**.

- **Без бота** (нет `TELEGRAM_BOT_TOKEN`): **«Подключить»** открывает эмулятор бота в приложении (`/app/settings/telegram`) с кнопками Start и **«Поделиться контактом»** и сообщениями бота.
- **Настоящий бот:** создайте его через [@BotFather](https://t.me/BotFather) и задайте `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` и `TELEGRAM_WEBHOOK_SECRET`. Локально рядом с `npm run dev` запустите `npm run tg:poll`: он забирает обновления у Telegram и передаёт их на локальный вебхук. **«Подключить»** открывает `t.me/<бот>?start=<код>` (одноразовый код на 15 минут); затем бот просит номер телефона и сверяет его с профилем.
- **Mini App** (`/tg`): профиль, тариф, счета с чеками и уведомления прямо в Telegram. Вход по `initData` от Telegram (проверка HMAC). Локально `/ru/tg?dev=1` открывает его в обычном браузере с текущей сессией сайта. Настоящему Mini App нужен HTTPS, поэтому он заработает после деплоя: `npm run tg:setup` ставит вебхук, команды и кнопку меню для `APP_URL`.

### Тесты

```bash
npm test                  # Vitest, отдельная prisma/test.db; dev.db не трогается
npx tsc --noEmit && npm run lint
```

Тесты покрывают обучение, упражнения, XP и лиги, цены и оплату, весь биллинг-цикл по дням, подписи Click, вебхук Stripe, почту, сброс пароля, Telegram и юридические страницы. GitHub Actions (`.github/workflows/ci.yml`) на каждый push запускает проверку типов, линтер, тесты и сборку.

### Деплой на Vercel + Neon

Локально приложение работает на SQLite, как и раньше. Для Vercel `npm run db:pg:schema` генерирует из `prisma/schema.prisma` схему Postgres `prisma/postgres/schema.prisma`, а её миграции лежат в `prisma/postgres/migrations`. Если сгенерированная схема устарела, CI падает.

1. Создайте проект на [neon.tech](https://neon.tech) и возьмите две строки подключения: **pooled** (в хосте есть `-pooler`) и **direct**.
2. Запишите их в `.env.neon` как `DATABASE_URL` (pooled) и `DIRECT_URL` (direct) и выполните `npm run db:pg:seed`: он применит миграции и заполнит базу демо-данными. Файл не попадает в git.
3. Импортируйте репозиторий в [Vercel](https://vercel.com). Скрипт `vercel-build` применяет новые миграции и собирает приложение.
4. Переменные окружения: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `APP_URL` (адрес прода), `CRON_SECRET`, а также по необходимости ключи AI, Stripe, Click, SMTP и Telegram (см. `.env.example`).
5. После деплоя: добавьте вебхук Stripe `https://<домен>/api/payments/stripe/webhook`, выполните `npm run tg:setup` с прод-`APP_URL` и укажите адреса Click в кабинете мерчанта.

Если pooled-подключение падает с ошибкой «prepared statement … already exists», добавьте в конец `DATABASE_URL` `&pgbouncer=true`. Как менять схему потом: правка `prisma/schema.prisma` → `npm run db:push` (локально) → `npm run db:pg:diff <имя>` → проверить SQL и закоммитить; Vercel применит миграцию при следующем деплое.

### AI

Ключи задаются в `.env`: `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`. Работает любой набор.

- Роутер сам находит актуальные модели и сначала пробует быстрые. Медленные Pro-модели идут в конце.
- При ошибке, перегрузке или таймауте он незаметно переходит к следующей модели.
- Если недоступны все модели, отвечает встроенный офлайн-репетитор, так что пользователь никогда не видит ошибку.

### Админка — `/admin`

- **Обзор** — статистика и последние платежи.
- **Пользователи** — тариф, уровень, сброс лимита, «войти как», удаление.
- **Подписки** — выручка за 30 дней, подписки, счета, транзакции, вебхуки и чеки (с повтором); инструменты для проверки: «запустить биллинг-цикл», перенос конца срока, «перемотать к концу периода / льготы», возврат, выдать тариф на N дней или навсегда.
- **AI-модели** — цепочка фолбэка, модели на паузе, тестовый запрос, журнал вызовов.
- **Темы** — какие темы доступны только в Pro.
- **Исходящие** — письма и сообщения в Telegram с просмотром.
- **Параметры** — лимиты и цены каждого тарифа, скидки, пробный и льготный период, способы оплаты, срок напоминания, реквизиты чека, офлайн-режим, порядок провайдеров.

### Стек

Next.js 15 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Framer Motion · Prisma + SQLite / Neon Postgres · Vitest · next-intl · Stripe · Web Speech API.
