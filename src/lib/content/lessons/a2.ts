import type { LessonSeed } from "../types";
import { anti, goal, item, l3 } from "./helpers";

export const A2_LESSONS: LessonSeed[] = [
  // ───────────── 1. Renting a flat ─────────────
  {
    slug: "a2-rent-flat",
    level: "A2",
    icon: "Building2",
    title: l3("Снять квартиру", "Renting a flat", "Kvartira ijaraga olish"),
    situation: l3(
      "Вы звоните хозяину квартиры в Чиланзаре по объявлению и договариваетесь о просмотре.",
      "You call a landlord about a flat in Chilanzar and arrange a viewing.",
      "Chilonzordagi kvartira e'loni boʻyicha uy egasiga qoʻngʻiroq qilib, koʻrishga kelishyapsiz.",
    ),
    canDo: l3(
      "Расспросить о квартире, цене и условиях и договориться о встрече.",
      "Ask about a flat, the price and conditions, and arrange a meeting.",
      "Kvartira, narx va shartlar haqida soʻrash hamda uchrashuvni kelishish.",
    ),
    items: [
      item("calling-about", "I'm calling about …", "fixed", ["я звоню по поводу …", "explains why you are phoning", "… haqida qoʻngʻiroq qilyapman"], ["Hello, I'm calling about the flat on your website."]),
      item("is-it-available", "Is it still available?", "fixed", ["она ещё свободна?", "asking if nobody has taken it yet", "hali boʻshmi?"], ["Is the flat still available?"]),
      item("rent", "the rent / pay the rent", "collocation", ["арендная плата / платить за аренду", "money you pay every month to live in a place", "ijara haqi / ijara toʻlamoq"], ["How much is the rent?", "I pay the rent on the first of the month."], {
        anti: [
          anti(
            "How much is the arenda?",
            "How much is the rent?",
            "«Аренда» по-английски — rent. Слово arenda в английском нет.",
            "The English word is 'rent'. 'Arenda' isn't English.",
            "Ijara inglizcha — rent. Arenda soʻzi ingliz tilida yoʻq.",
          ),
        ],
      }),
      item("bills-included", "Are the bills included?", "fixed", ["коммунальные включены?", "asking if gas, water, electricity are in the price", "kommunal toʻlovlar kiritilganmi?"], ["Is gas included in the rent?"]),
      item("furnished", "fully furnished", "collocation", ["полностью меблирована", "with all the furniture", "toʻliq jihozlangan"], ["The flat is fully furnished."]),
      item("move-in", "move in / move out", "phrasal", ["въехать / съехать", "to start / stop living in a home", "koʻchib kirmoq / koʻchib chiqmoq"], ["When can I move in?"], {
        anti: [
          anti(
            "When can I come to live?",
            "When can I move in?",
            "Для переезда в жильё есть точный фразовый глагол move in.",
            "There's an exact phrasal verb for starting to live somewhere: move in.",
            "Yangi uyga koʻchish uchun aniq frazali fe'l bor: move in.",
          ),
        ],
      }),
      item("have-a-look", "have a look at", "collocation", ["посмотреть", "to look at something, often to check it", "koʻrib chiqmoq"], ["Can I have a look at the flat tomorrow?"]),
      item("deposit", "pay a deposit", "collocation", ["внести залог", "money you pay first, returned later", "garov toʻlamoq"], ["Do I need to pay a deposit?"]),
      item("how-far", "How far is it from …?", "fixed", ["далеко ли от …?", "asking about distance", "…dan qanchalik uzoq?"], ["How far is it from the metro?"]),
    ],
    exercises: [
      { type: "dialogue", line: "Hello, Akmal speaking.", options: ["Hello! I'm calling about the flat.", "Hello! I'm calling for the flat rent pay.", "Hello! Is it you?"], answer: 0, item: "calling-about" },
      { type: "choice", prompt: "How much is the ___?", options: ["arenda", "rent", "renting money"], answer: 1, item: "rent" },
      { type: "collocate", prompt: "When can I move ___?", options: ["on", "in", "to"], answer: 1, item: "move-in" },
      { type: "collocate", prompt: "Can I ___ a look at the flat tomorrow?", options: ["make", "have", "do"], answer: 1, item: "have-a-look" },
      { type: "gap", prompt: "Are the bills ___ in the price?", answer: "included", item: "bills-included" },
      { type: "translate", from: l3("Квартира ещё свободна?", "Ask if the flat is free.", "Kvartira hali boʻshmi?"), answer: "Is the flat still available?", accept: ["Is it still available?", "Is the flat still available"], item: "is-it-available" },
      { type: "order", answer: "Do I need to pay a deposit?", hint: l3("Нужно ли вносить залог?", "Ask about a deposit", "Garov toʻlashim kerakmi?"), item: "deposit" },
      { type: "spot", sentence: "When can I come to live there?", wrong: "come to live there", right: "move in", why: l3("Естественнее: When can I move in?", "More natural: When can I move in?", "Tabiiyroq: When can I move in?"), item: "move-in" },
    ],
    mission: {
      role: "Akmal, a landlord renting out a two-room flat in Chilanzar, Tashkent",
      scene: l3("Телефонный звонок по объявлению", "A phone call about an ad", "E'lon boʻyicha telefon qoʻngʻirogʻi"),
      opener: "Hello, Akmal speaking. How can I help you?",
      goals: [
        goal("reason", ["Скажите, зачем звоните", "Say why you're calling", "Nima uchun qoʻngʻiroq qilganingizni ayting"], ["calling about", "the flat", "your ad"]),
        goal("price", ["Узнайте цену", "Ask about the rent", "Ijara narxini soʻrang"], ["how much", "rent", "price"]),
        goal("bills", ["Спросите про коммуналку или залог", "Ask about bills or a deposit", "Kommunal toʻlov yoki garov haqida soʻrang"], ["bills", "included", "deposit", "gas", "electricity"]),
        goal("viewing", ["Договоритесь о просмотре", "Arrange a viewing", "Koʻrishga kelishing"], ["have a look", "see the flat", "tomorrow", "come", "visit"]),
      ],
      script: [
        "Yes, the two-room flat. It's still available.",
        "The rent is 5 million sums a month. It's fully furnished.",
        "Bills are not included. And there's a deposit of one month.",
        "Sure, come tomorrow at six. See you then!",
      ],
    },
  },

  // ───────────── 2. At the doctor's ─────────────
  {
    slug: "a2-doctor",
    level: "A2",
    icon: "HeartPulse",
    title: l3("У врача", "At the doctor's", "Shifokor qabulida"),
    situation: l3(
      "Вы заболели в поездке и пришли в международную клинику.",
      "You got ill on a trip and came to an international clinic.",
      "Safarda kasal boʻlib qoldingiz va xalqaro klinikaga keldingiz.",
    ),
    canDo: l3(
      "Описать симптомы, сказать, как давно болеете, и понять совет врача.",
      "Describe symptoms, say how long you've been ill, and understand the doctor's advice.",
      "Alomatlarni tasvirlash, qancha vaqtdan beri kasalligingizni aytish va shifokor maslahatini tushunish.",
    ),
    items: [
      item("feel-sick", "I don't feel well", "fixed", ["я плохо себя чувствую", "you feel ill", "oʻzimni yomon his qilyapman"], ["I don't feel well today."]),
      item("have-a-headache", "have a headache", "collocation", ["болит голова", "pain in your head", "boshim ogʻriyapti"], ["I have a headache and a sore throat."], {
        anti: [
          anti(
            "My head is hurting me very much ill.",
            "I have a bad headache.",
            "Про боль говорят через have: have a headache, have a stomachache.",
            "Pain is usually said with 'have': have a headache, have a stomachache.",
            "Ogʻriq odatda have bilan aytiladi: have a headache, have a stomachache.",
          ),
        ],
      }),
      item("sore-throat", "a sore throat", "collocation", ["болит горло", "pain in your throat", "tomoq ogʻrigʻi"], ["I've got a sore throat."]),
      item("temperature", "have a temperature", "collocation", ["температура (повышенная)", "your body is hotter than normal", "isitmam bor"], ["I have a high temperature."], {
        anti: [
          anti(
            "I have temperature 38.",
            "I have a temperature of 38.",
            "Нужен артикль: have a temperature (of 38).",
            "You need the article: have a temperature (of 38).",
            "Artikl kerak: have a temperature (of 38).",
          ),
        ],
      }),
      item("since", "since yesterday / for two days", "fixed", ["со вчерашнего дня / уже два дня", "how long something has lasted", "kechadan beri / ikki kundan beri"], ["I've had a cough since Monday.", "I've felt sick for two days."]),
      item("allergic-to", "be allergic to", "collocation", ["аллергия на", "your body reacts badly to something", "…ga allergiyasi bor"], ["I'm allergic to penicillin."]),
      item("take-medicine", "take medicine", "collocation", ["принимать лекарство", "to swallow medicine", "dori ichmoq"], ["Take this medicine twice a day."], {
        anti: [
          anti(
            "Drink this tablet three times.",
            "Take this tablet three times a day.",
            "Таблетки и лекарства «принимают» — take, а не drink.",
            "You 'take' tablets and medicine, you don't 'drink' them.",
            "Tabletka va dorilar take bilan aytiladi, drink emas.",
          ),
        ],
      }),
      item("get-better", "get better", "phrasal", ["выздоравливать", "to become healthy again", "tuzalmoq"], ["Get better soon!", "I hope you get better."]),
      item("prescription", "a prescription", "word", ["рецепт (от врача)", "a doctor's paper for medicine", "retsept"], ["Here's your prescription."]),
    ],
    exercises: [
      { type: "collocate", prompt: "I ___ a headache.", options: ["have", "am", "feel a"], answer: 0, item: "have-a-headache" },
      { type: "choice", prompt: "I have ___ temperature.", options: ["—", "a", "the"], answer: 1, item: "temperature" },
      { type: "collocate", prompt: "___ this medicine twice a day.", options: ["Drink", "Take", "Eat"], answer: 1, item: "take-medicine" },
      { type: "gap", prompt: "I've had a cough ___ Monday.", answer: "since", item: "since" },
      { type: "gap", prompt: "I'm allergic ___ penicillin.", answer: "to", item: "allergic-to" },
      { type: "dialogue", line: "What seems to be the problem?", options: ["I don't feel well. I have a sore throat.", "I'm problem.", "Take my medicine."], answer: 0, item: "feel-sick" },
      { type: "translate", from: l3("Выздоравливай скорее!", "Wish someone good health.", "Tezroq tuzal!"), answer: "Get better soon!", accept: ["Get well soon!", "Get better soon"], item: "get-better" },
      { type: "spot", sentence: "Drink this tablet after dinner.", wrong: "Drink", right: "Take", why: l3("Таблетки — take.", "Tablets — take.", "Tabletka — take."), item: "take-medicine" },
    ],
    mission: {
      role: "a kind doctor at an international clinic in Tashkent",
      scene: l3("Кабинет врача, утро", "A doctor's office, morning", "Shifokor xonasi, ertalab"),
      opener: "Good morning! Please sit down. What seems to be the problem?",
      goals: [
        goal("symptom", ["Опишите симптом", "Describe a symptom", "Alomatni tasvirlang"], ["headache", "sore throat", "temperature", "cough", "pain", "don't feel well"]),
        goal("how-long", ["Скажите, как давно", "Say how long", "Qancha vaqtdan beri ekanini ayting"], ["since", "for two", "for three", "days", "yesterday"]),
        goal("allergy", ["Скажите про аллергию", "Mention allergies", "Allergiya haqida ayting"], ["allergic", "allergy", "no allergies"]),
        goal("advice", ["Уточните, как принимать лекарство", "Ask how to take the medicine", "Dorini qanday ichishni soʻrang"], ["how often", "take", "times a day", "how many"]),
      ],
      script: [
        "I see. How long have you felt like this?",
        "OK. Are you allergic to any medicine?",
        "It's a cold. I'll give you a prescription.",
        "Take one tablet three times a day after meals. Get better soon!",
      ],
    },
  },

  // ───────────── 3. Airport ─────────────
  {
    slug: "a2-airport",
    level: "A2",
    icon: "Plane",
    title: l3("Аэропорт и регистрация", "Airport check-in", "Aeroport va roʻyxatdan oʻtish"),
    situation: l3(
      "Вы летите из Ташкента в Стамбул и проходите регистрацию и посадку.",
      "You fly from Tashkent to Istanbul and go through check-in and boarding.",
      "Toshkentdan Istanbulga uchyapsiz: roʻyxatdan oʻtish va samolyotga chiqish.",
    ),
    canDo: l3(
      "Пройти регистрацию, сдать багаж, попросить место и понять объявления.",
      "Check in, drop your bags, ask for a seat, and understand announcements.",
      "Roʻyxatdan oʻtish, yukni topshirish, joy soʻrash va e'lonlarni tushunish.",
    ),
    items: [
      item("check-in", "check in", "phrasal", ["регистрироваться", "to show your ticket and get a boarding pass", "roʻyxatdan oʻtmoq"], ["Where do I check in for Turkish Airlines?"]),
      item("boarding-pass", "a boarding pass", "collocation", ["посадочный талон", "the card you need to get on the plane", "bort taloni"], ["Here's your boarding pass. Gate 5."]),
      item("window-seat", "a window / an aisle seat", "collocation", ["место у окна / у прохода", "where you sit on the plane", "deraza / yoʻlak yonidagi joy"], ["Can I have a window seat, please?"]),
      item("hand-luggage", "hand luggage", "collocation", ["ручная кладь", "a small bag you take on the plane", "qoʻl yuki"], ["Is this your hand luggage?"], {
        anti: [
          anti(
            "I have two baggages.",
            "I have two bags.",
            "luggage и baggage неисчисляемые — нельзя сказать two baggages. Считаем bags или pieces of luggage.",
            "'Luggage' and 'baggage' are uncountable. Count 'bags' or 'pieces of luggage'.",
            "luggage va baggage sanalmaydi. bags yoki pieces of luggage deb sanaladi.",
          ),
        ],
      }),
      item("on-time", "on time / delayed", "fixed", ["вовремя / задерживается", "leaving at the planned time / later", "oʻz vaqtida / kechikmoqda"], ["Is the flight on time? — No, it's delayed."]),
      item("take-off", "take off", "phrasal", ["взлетать", "when a plane leaves the ground", "havoga koʻtarilmoq"], ["The plane takes off at 9:40."]),
      item("miss-a-flight", "miss a flight", "collocation", ["опоздать на рейс", "to arrive too late for your plane", "reysga kechikib qolmoq"], ["Hurry, or we'll miss our flight!"], {
        anti: [
          anti(
            "I was late on my flight.",
            "I missed my flight.",
            "Если самолёт улетел без вас — missed my flight. Be late for — просто прийти позже.",
            "If the plane left without you, you 'missed your flight'.",
            "Samolyot sizsiz uchib ketsa — missed my flight.",
          ),
        ],
      }),
      item("gate", "go to gate …", "collocation", ["пройти к выходу …", "the door where you get on your plane", "… chiqish eshigiga bormoq"], ["Please go to gate 12."]),
    ],
    exercises: [
      { type: "collocate", prompt: "Where do I ___ in?", options: ["check", "make", "sign"], answer: 0, item: "check-in" },
      { type: "choice", prompt: "I have two ___.", options: ["baggages", "luggages", "bags"], answer: 2, item: "hand-luggage" },
      { type: "dialogue", line: "Window or aisle?", options: ["A window seat, please.", "On time, please.", "I'm a window."], answer: 0, item: "window-seat" },
      { type: "gap", prompt: "The plane takes ___ at 9:40.", answer: "off", item: "take-off" },
      { type: "collocate", prompt: "Hurry, or we'll ___ our flight!", options: ["lose", "miss", "late"], answer: 1, item: "miss-a-flight" },
      { type: "translate", from: l3("Рейс задерживается?", "Ask if the flight is late.", "Reys kechikyaptimi?"), answer: "Is the flight delayed?", accept: ["Is the flight delayed", "Is my flight delayed?"], item: "on-time" },
      { type: "order", answer: "Here is your boarding pass.", hint: l3("Вот ваш посадочный.", "Give someone their pass", "Mana bort talonigiz."), item: "boarding-pass" },
    ],
    mission: {
      role: "a check-in agent at Tashkent International Airport",
      scene: l3("Стойка регистрации, терминал 2", "Check-in desk, Terminal 2", "Roʻyxatdan oʻtish stoyka, 2-terminal"),
      opener: "Good evening! Where are you flying today? Passport, please.",
      goals: [
        goal("destination", ["Назовите направление", "Say where you're flying", "Qayerga uchishingizni ayting"], ["istanbul", "flying to", "to "]),
        goal("bags", ["Расскажите про багаж", "Talk about your bags", "Yuk haqida ayting"], ["bag", "luggage", "suitcase"]),
        goal("seat", ["Попросите место", "Ask for a seat", "Joy soʻrang"], ["window", "aisle", "seat"]),
        goal("time", ["Спросите про время или выход", "Ask about the time or gate", "Vaqt yoki chiqish haqida soʻrang"], ["gate", "on time", "delayed", "boarding", "when"]),
      ],
      script: [
        "Thank you. Do you have any bags to check in?",
        "OK, put it on the scale, please. Would you like a window or an aisle seat?",
        "Done. Here's your boarding pass.",
        "Gate 7. Boarding starts at 21:10. Have a nice flight!",
      ],
    },
  },

  // ───────────── 4. Calling the bank ─────────────
  {
    slug: "a2-bank-call",
    level: "A2",
    icon: "Landmark",
    title: l3("Звонок в банк", "Calling the bank", "Bankka qoʻngʻiroq"),
    situation: l3(
      "Ваша карта не работает за границей — вы звоните в поддержку банка.",
      "Your card doesn't work abroad — you call the bank's support line.",
      "Kartangiz chet elda ishlamayapti — bank qoʻllab-quvvatlash xizmatiga qoʻngʻiroq qilyapsiz.",
    ),
    canDo: l3(
      "Объяснить проблему с картой, ответить на вопросы и попросить решение.",
      "Explain a card problem, answer security questions, and ask for a solution.",
      "Karta muammosini tushuntirish, savollarga javob berish va yechim soʻrash.",
    ),
    items: [
      item("doesnt-work", "My card doesn't work", "fixed", ["моя карта не работает", "the card can't be used", "kartam ishlamayapti"], ["My card doesn't work in the shop."]),
      item("block-card", "block a card", "collocation", ["заблокировать карту", "to stop a card from being used", "kartani bloklamoq"], ["I lost my card. Can you block it, please?"]),
      item("hold-on", "hold on", "phrasal", ["подождите (на линии)", "wait a moment on the phone", "kutib turing"], ["Hold on, please. I'll check."], {
        anti: [
          anti(
            "Wait me, please.",
            "Hold on, please. / Wait for me, please.",
            "После wait нужен for: wait for me. По телефону чаще говорят hold on.",
            "'Wait' needs 'for': wait for me. On the phone, people say 'hold on'.",
            "wait dan keyin for kerak: wait for me. Telefonda koʻpincha hold on deyiladi.",
          ),
        ],
      }),
      item("account", "open an account / check the balance", "collocation", ["открыть счёт / проверить баланс", "start using a bank / see how much money you have", "hisob ochmoq / balansni tekshirmoq"], ["I'd like to check my balance."]),
      item("transfer", "make a transfer", "collocation", ["сделать перевод", "to send money", "pul oʻtkazmasi qilmoq"], ["I want to make a transfer to my sister."], {
        anti: [
          anti(
            "I want to do a perevod.",
            "I want to make a transfer.",
            "Денежный перевод — transfer, и с ним используют make.",
            "A money transfer is 'a transfer', and we 'make' it.",
            "Pul oʻtkazmasi — transfer, u make bilan ishlatiladi.",
          ),
        ],
      }),
      item("spell", "Could you spell that?", "fixed", ["продиктуйте по буквам", "asking someone to say the letters one by one", "harflab ayta olasizmi?"], ["Could you spell your surname, please?"]),
      item("go-through", "the payment didn't go through", "phrasal", ["платёж не прошёл", "the payment failed", "toʻlov oʻtmadi"], ["I tried to pay, but it didn't go through."]),
      item("sort-out", "sort out a problem", "phrasal", ["решить проблему", "to fix a problem", "muammoni hal qilmoq"], ["Don't worry, we'll sort it out."]),
    ],
    exercises: [
      { type: "dialogue", line: "How can I help you?", options: ["My card doesn't work abroad.", "My card is not working me.", "Hold on, I'm bank."], answer: 0, item: "doesnt-work" },
      { type: "choice", prompt: "Please ___ a moment.", options: ["wait me", "hold on", "hold up me"], answer: 1, item: "hold-on" },
      { type: "collocate", prompt: "I want to ___ a transfer.", options: ["do", "make", "give"], answer: 1, item: "transfer" },
      { type: "gap", prompt: "I tried to pay, but the payment didn't go ___.", answer: "through", item: "go-through" },
      { type: "collocate", prompt: "I lost my card. Can you ___ it?", options: ["close", "block", "stop up"], answer: 1, item: "block-card" },
      { type: "translate", from: l3("Продиктуйте фамилию по буквам.", "Ask for the letters of a surname.", "Familiyangizni harflab ayting."), answer: "Could you spell your surname, please?", accept: ["Can you spell your surname, please?", "Could you spell your surname?"], item: "spell" },
      { type: "order", answer: "Don't worry, we'll sort it out.", hint: l3("Не волнуйтесь, мы решим это.", "Calm someone down", "Xavotir olmang, hal qilamiz."), item: "sort-out" },
    ],
    mission: {
      role: "a polite support agent at a Tashkent bank call centre",
      scene: l3("Звонок в поддержку из Дубая", "A support call from Dubai", "Dubaydan qoʻllab-quvvatlashga qoʻngʻiroq"),
      opener: "Good afternoon, thank you for calling. How can I help you?",
      goals: [
        goal("problem", ["Опишите проблему", "Describe the problem", "Muammoni tasvirlang"], ["doesn't work", "didn't go through", "card", "problem"]),
        goal("where", ["Скажите, где вы", "Say where you are", "Qayerdaligingizni ayting"], ["dubai", "abroad", "i'm in"]),
        goal("name", ["Назовите имя по буквам", "Spell your name", "Ismingizni harflab ayting"], ["my name", "-", "spell"]),
        goal("solution", ["Попросите решить проблему", "Ask for a solution", "Yechim soʻrang"], ["sort", "fix", "unblock", "can you", "help"]),
      ],
      script: [
        "I'm sorry to hear that. Where are you now?",
        "I see. Could you spell your full name, please?",
        "Thank you. Hold on, please… Your card is blocked for payments abroad.",
        "I've sorted it out. It will work in five minutes. Anything else?",
      ],
    },
  },

  // ───────────── 5. Weekend plans ─────────────
  {
    slug: "a2-weekend",
    level: "A2",
    icon: "CalendarDays",
    title: l3("Планы на выходные", "Weekend plans", "Dam olish kunlari rejalari"),
    situation: l3(
      "Коллега-иностранец спрашивает, что вы делаете в выходные, и вы зовёте его в горы.",
      "A colleague from abroad asks about your weekend, and you invite them to the mountains.",
      "Chet ellik hamkasbingiz dam olish kunlari haqida soʻrayapti, siz uni togʻga taklif qilasiz.",
    ),
    canDo: l3(
      "Рассказать о планах, пригласить, согласиться или вежливо отказаться.",
      "Talk about plans, invite someone, and accept or politely refuse.",
      "Rejalar haqida gapirish, taklif qilish, rozi boʻlish yoki muloyim rad etish.",
    ),
    items: [
      item("going-to", "I'm going to …", "fixed", ["я собираюсь …", "a plan you've already decided", "… qilmoqchiman"], ["I'm going to visit my parents on Saturday."]),
      item("do-you-want", "Do you want to …?", "fixed", ["хочешь …?", "an informal invitation", "… xohlaysanmi?"], ["Do you want to come with us to Chimgan?"], { register: "informal" }),
      item("id-love-to", "I'd love to", "fixed", ["с удовольствием", "a happy yes to an invitation", "jonim bilan"], ["Chimgan? I'd love to!"]),
      item("go-hiking", "go hiking", "collocation", ["пойти в поход", "to walk in the mountains or nature", "sayrga (togʻga) chiqmoq"], ["We go hiking every spring."], {
        anti: [
          anti(
            "We go to hiking.",
            "We go hiking.",
            "С активностями на -ing нет предлога: go hiking, go shopping, go swimming.",
            "With -ing activities there's no 'to': go hiking, go shopping.",
            "-ing faoliyatlar bilan to ishlatilmaydi: go hiking, go shopping.",
          ),
        ],
      }),
      item("free", "Are you free on …?", "fixed", ["ты свободен в …?", "asking if someone has time", "…da boʻshmisan?"], ["Are you free on Sunday?"]),
      item("pick-up", "pick someone up", "phrasal", ["заехать за кем-то", "to collect someone by car", "kimnidir olib ketmoq"], ["I'll pick you up at eight."]),
      item("maybe-next-time", "Maybe next time", "fixed", ["может, в другой раз", "a soft way to say no", "balki keyingi safar"], ["Sorry, I'm busy. Maybe next time!"], {
        anti: [
          anti(
            "No, I don't want.",
            "Sorry, I can't. Maybe next time!",
            "Прямое «no, I don't want» звучит грубо. Объясните и предложите другой раз.",
            "A flat 'No, I don't want' sounds rude. Give a reason and suggest another time.",
            "«No, I don't want» qoʻpol eshitiladi. Sabab ayting va boshqa vaqt taklif qiling.",
          ),
        ],
      }),
      item("sounds-good", "Sounds good!", "fixed", ["звучит здорово!", "you like the idea", "zoʻr fikr!"], ["Let's meet at Magic City. — Sounds good!"], { register: "informal" }),
      item("hang-out", "hang out with friends", "phrasal", ["проводить время с друзьями", "to spend relaxed time together", "doʻstlar bilan vaqt oʻtkazmoq"], ["I usually hang out with friends on Fridays."], { register: "informal" }),
    ],
    exercises: [
      { type: "choice", prompt: "We ___ hiking every spring.", options: ["go to", "go", "make"], answer: 1, item: "go-hiking" },
      { type: "dialogue", line: "Do you want to come to Chimgan with us?", options: ["I'd love to!", "I'd love.", "Yes, I go to hiking."], answer: 0, item: "id-love-to" },
      { type: "dialogue", line: "Let's go to the cinema on Friday!", options: ["Sorry, I can't. Maybe next time!", "No, I don't want.", "No cinema."], answer: 0, item: "maybe-next-time" },
      { type: "gap", prompt: "I'll pick you ___ at eight.", answer: "up", item: "pick-up" },
      { type: "gap", prompt: "I'm ___ to visit my parents on Saturday.", answer: "going", item: "going-to" },
      { type: "translate", from: l3("Ты свободен в воскресенье?", "Ask if someone has time on Sunday.", "Yakshanba kuni boʻshmisan?"), answer: "Are you free on Sunday?", accept: ["Are you free on Sunday", "Are you free this Sunday?"], item: "free" },
      { type: "collocate", prompt: "I usually ___ out with friends on Fridays.", options: ["hang", "go", "spend"], answer: 0, item: "hang-out" },
    ],
    mission: {
      role: "Tom, a colleague from the UK working in Tashkent, chatting on Friday afternoon",
      scene: l3("Пятница, офис, конец дня", "Friday, the office, end of the day", "Juma, ofis, kun oxiri"),
      opener: "Finally Friday! Any plans for the weekend?",
      goals: [
        goal("plans", ["Расскажите о планах", "Talk about your plans", "Rejalaringiz haqida gapiring"], ["going to", "i'll", "i will", "plan"]),
        goal("invite", ["Пригласите Тома", "Invite Tom", "Tomni taklif qiling"], ["do you want", "would you like", "come with", "join"]),
        goal("time", ["Договоритесь о времени", "Agree on a time", "Vaqtni kelishing"], ["pick you up", "at ", "o'clock", "morning"]),
        goal("react", ["Отреагируйте на ответ", "React to the answer", "Javobga munosabat bildiring"], ["sounds good", "great", "cool", "perfect"]),
      ],
      script: [
        "Nice! I don't have plans yet. What's Chimgan like?",
        "That sounds amazing! I'd love to come.",
        "Perfect. Where should we meet?",
        "Great, see you on Saturday then!",
      ],
    },
  },

  // ───────────── 6. Hotel complaint ─────────────
  {
    slug: "a2-hotel",
    level: "A2",
    icon: "Building2",
    title: l3("Жалоба в отеле", "A problem at the hotel", "Mehmonxonada shikoyat"),
    situation: l3(
      "В вашем номере в Самарканде не работает кондиционер — вы идёте на ресепшен.",
      "The air conditioner in your Samarkand hotel room doesn't work — you go to reception.",
      "Samarqanddagi mehmonxona xonangizda konditsioner ishlamayapti — resepshnga borasiz.",
    ),
    canDo: l3(
      "Вежливо пожаловаться, объяснить проблему и попросить решение.",
      "Complain politely, explain the problem, and ask for a solution.",
      "Muloyimlik bilan shikoyat qilish, muammoni tushuntirish va yechim soʻrash.",
    ),
    items: [
      item("im-afraid", "I'm afraid there's a problem", "fixed", ["боюсь, есть проблема", "a polite start to a complaint", "afsuski, muammo bor"], ["I'm afraid there's a problem with my room."]),
      item("isnt-working", "… isn't working", "fixed", ["… не работает", "something is broken", "… ishlamayapti"], ["The air conditioner isn't working."], {
        anti: [
          anti(
            "The conditioner doesn't work.",
            "The air conditioner isn't working.",
            "conditioner — это бальзам для волос! Кондиционер — air conditioner (или AC).",
            "A 'conditioner' is for hair! The machine is an 'air conditioner' (AC).",
            "conditioner — soch balzami! Konditsioner — air conditioner (AC).",
          ),
        ],
      }),
      item("could-you", "Could you …?", "fixed", ["не могли бы вы …?", "a very polite request", "… qila olasizmi?"], ["Could you send someone to fix it?"]),
      item("change-room", "change rooms", "collocation", ["поменять номер", "to move to another room", "xonani almashtirmoq"], ["Can I change rooms, please?"]),
      item("noisy", "too noisy", "collocation", ["слишком шумно", "with too much noise", "juda shovqinli"], ["The room is too noisy at night."]),
      item("towels", "clean towels", "collocation", ["чистые полотенца", "new towels", "toza sochiqlar"], ["Could I have some clean towels?"]),
      item("check-out", "check out", "phrasal", ["выезжать из отеля", "to leave a hotel and pay", "mehmonxonadan chiqmoq"], ["What time is check-out?", "I'd like to check out."]),
      item("look-into", "look into it", "phrasal", ["разобраться в этом", "to check and try to fix a problem", "koʻrib chiqmoq"], ["We'll look into it right away."]),
    ],
    exercises: [
      { type: "choice", prompt: "The ___ isn't working.", options: ["conditioner", "air conditioner", "cold machine"], answer: 1, item: "isnt-working" },
      { type: "dialogue", line: "Good evening! How can I help?", options: ["I'm afraid there's a problem with my room.", "Your room is bad!", "I afraid problem."], answer: 0, item: "im-afraid" },
      { type: "collocate", prompt: "Can I ___ rooms, please?", options: ["change", "move", "replace"], answer: 0, item: "change-room" },
      { type: "gap", prompt: "We'll look ___ it right away.", answer: "into", item: "look-into" },
      { type: "gap", prompt: "What time is check-___?", answer: "out", item: "check-out" },
      { type: "translate", from: l3("Не могли бы вы прислать кого-нибудь?", "Ask politely for someone to come.", "Kimnidir yubora olasizmi?"), answer: "Could you send someone?", accept: ["Could you send someone, please?", "Could you send somebody?"], item: "could-you" },
      { type: "order", answer: "The room is too noisy at night.", hint: l3("В номере слишком шумно ночью.", "Complain about noise", "Kechasi xona juda shovqinli."), item: "noisy" },
    ],
    mission: {
      role: "a receptionist at a boutique hotel in Samarkand",
      scene: l3("Ресепшен отеля, поздний вечер", "Hotel reception, late evening", "Mehmonxona resepshni, kech oqshom"),
      opener: "Good evening! How can I help you?",
      goals: [
        goal("problem", ["Опишите проблему", "Describe the problem", "Muammoni tasvirlang"], ["isn't working", "doesn't work", "broken", "problem", "noisy"]),
        goal("polite", ["Будьте вежливы", "Be polite", "Muloyim boʻling"], ["i'm afraid", "could you", "please", "sorry"]),
        goal("solution", ["Попросите решение", "Ask for a solution", "Yechim soʻrang"], ["change rooms", "another room", "fix", "send someone"]),
        goal("thanks", ["Поблагодарите", "Say thank you", "Rahmat ayting"], ["thank"]),
      ],
      script: [
        "Oh, I'm so sorry about that. Which room are you in?",
        "I see. We'll look into it right away.",
        "Our technician is busy. Would you like to change rooms?",
        "Here's your new key — room 305. Have a good night!",
      ],
    },
  },
];
