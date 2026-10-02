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

### Plans

- **Free** — levels A1–A2, a daily time limit (15 minutes by default, resets at midnight Tashkent time), simple mistake review.
- **Pro** — all levels and topics, unlimited time, detailed mistake review (rule + examples), pronunciation coach, personal plan with quizzes.

Payments aren't connected yet. The **Get Pro** button records a request, and it shows up in the admin panel. Plans are switched from the admin panel.

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
- **Settings** — Free limit, offline mode, provider order.

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

### Tariflar

- **Free** — A1–A2 darajalari, kunlik vaqt limiti (standart 15 daqiqa, Toshkent vaqti bilan yarim tunda yangilanadi), xatolarning oddiy tahlili.
- **Pro** — barcha darajalar va mavzular, cheksiz vaqt, xatolarning batafsil tahlili (qoida + misollar), talaffuz trenajyori, testlardan iborat shaxsiy reja.

Toʻlov hali ulanmagan. **Pro olish** tugmasi soʻrovni saqlaydi, u admin panelda koʻrinadi. Tarif admin paneldan almashtiriladi.

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
- **Sozlamalar** — Free limiti, oflayn rejim, provayderlar tartibi.

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

### Тарифы

- **Free** — уровни A1–A2, дневной лимит времени (по умолчанию 15 минут, сброс в полночь по Ташкенту), простой разбор ошибок.
- **Pro** — все уровни и темы, без лимита, подробный разбор ошибок (правило + примеры), тренажёр произношения, персональный план с квизами.

Оплата пока не подключена. Кнопка **«Перейти на Pro»** сохраняет заявку, и она видна в админке. Тариф переключается в админке.

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
- **Параметры** — лимит Free, офлайн-режим, порядок провайдеров.

### Стек

Next.js 15 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Framer Motion · Prisma + SQLite · next-intl · Web Speech API.
