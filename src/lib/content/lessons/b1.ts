import type { LessonSeed } from "../types";
import { anti, goal, item, l3 } from "./helpers";

export const B1_LESSONS: LessonSeed[] = [
  // ───────────── 1. Job interview ─────────────
  {
    slug: "b1-job-interview",
    level: "B1",
    icon: "Briefcase",
    title: l3("Собеседование в IT Park", "A job interview at IT Park", "IT Parkda suhbat"),
    situation: l3(
      "Вы проходите собеседование на позицию junior-разработчика в международную компанию в IT Park.",
      "You have an interview for a junior developer role at an international company in IT Park.",
      "IT Parkdagi xalqaro kompaniyada junior dasturchi lavozimiga suhbatdan oʻtyapsiz.",
    ),
    canDo: l3(
      "Рассказать о себе, опыте и сильных сторонах и задать вопросы работодателю.",
      "Talk about yourself, your experience and strengths, and ask the employer questions.",
      "Oʻzingiz, tajribangiz va kuchli tomonlaringiz haqida gapirish hamda ish beruvchiga savol berish.",
    ),
    items: [
      item("tell-me-about", "Tell me about yourself", "fixed", ["расскажите о себе", "a typical first interview question", "oʻzingiz haqingizda gapirib bering"], ["So, tell me a little about yourself."]),
      item("have-experience", "have experience in", "collocation", ["иметь опыт в", "to have done something before at work", "…da tajribaga ega boʻlmoq"], ["I have two years of experience in web development."], {
        anti: [
          anti(
            "I have an experience of two years.",
            "I have two years of experience.",
            "experience в значении «опыт работы» неисчисляемое: без a.",
            "'Experience' (work experience) is uncountable: no 'an'.",
            "experience («ish tajribasi») sanalmaydi: a/an qoʻyilmaydi.",
          ),
        ],
      }),
      item("in-charge-of", "be in charge of", "fixed", ["отвечать за", "to be responsible for", "…ga mas'ul boʻlmoq"], ["I was in charge of the mobile app."]),
      item("strengths", "my main strength is", "fixed", ["моя сильная сторона —", "the thing you are best at", "asosiy kuchli tomonim —"], ["My main strength is that I learn fast."]),
      item("team-player", "a team player", "idiom", ["командный игрок", "someone who works well with others", "jamoada yaxshi ishlaydigan odam"], ["I'm a team player, but I can work alone too."]),
      item("meet-deadlines", "meet a deadline", "collocation", ["уложиться в срок", "to finish work on time", "muddatga ulgurmoq"], ["We always met our deadlines."], {
        anti: [
          anti(
            "We always made the deadline in time.",
            "We always met our deadlines.",
            "С deadline используют meet (уложиться) или miss (сорвать).",
            "With 'deadline' we use 'meet' (or 'miss').",
            "deadline bilan meet (ulgurmoq) yoki miss (ulgurmaslik) ishlatiladi.",
          ),
        ],
      }),
      item("look-forward", "look forward to", "phrasal", ["с нетерпением ждать", "to wait for something with pleasure", "intiqlik bilan kutmoq"], ["I look forward to hearing from you."], {
        anti: [
          anti(
            "I look forward to hear from you.",
            "I look forward to hearing from you.",
            "to здесь предлог, после него нужна форма -ing.",
            "Here 'to' is a preposition, so use the -ing form.",
            "Bu yerda to — predlog, undan keyin -ing shakli keladi.",
          ),
        ],
      }),
      item("pick-up-skills", "pick up new skills", "phrasal", ["быстро осваивать новые навыки", "to learn something without much effort", "yangi koʻnikmalarni tez oʻzlashtirmoq"], ["I pick up new frameworks quickly."]),
      item("career-goals", "career goals", "collocation", ["карьерные цели", "what you want to achieve at work", "martaba maqsadlari"], ["My career goal is to become a team lead."]),
      item("ask-a-question", "Can I ask about …?", "fixed", ["можно спросить про …?", "a polite way to ask an employer", "… haqida soʻrasam maylimi?"], ["Can I ask about the team I'd be working with?"]),
    ],
    exercises: [
      { type: "choice", prompt: "I have two years of ___ in web development.", options: ["an experience", "experience", "experiences"], answer: 1, item: "have-experience" },
      { type: "collocate", prompt: "We always ___ our deadlines.", options: ["made", "met", "did"], answer: 1, item: "meet-deadlines" },
      { type: "choice", prompt: "I look forward to ___ from you.", options: ["hear", "hearing", "heard"], answer: 1, item: "look-forward" },
      { type: "gap", prompt: "I was in ___ of the mobile app.", answer: "charge", item: "in-charge-of" },
      { type: "dialogue", line: "What are your strengths?", options: ["My main strength is that I learn fast.", "I'm very strength.", "My strength is deadlines."], answer: 0, item: "strengths" },
      { type: "translate", from: l3("Я командный игрок.", "Say you work well with others.", "Men jamoada yaxshi ishlayman."), answer: "I'm a team player.", accept: ["I am a team player.", "I'm a team player"], item: "team-player" },
      { type: "gap", prompt: "I pick ___ new frameworks quickly.", answer: "up", item: "pick-up-skills" },
      { type: "order", answer: "Can I ask about the team?", hint: l3("Можно спросить о команде?", "Ask the interviewer a question", "Jamoa haqida soʻrasam maylimi?"), item: "ask-a-question" },
      { type: "spot", sentence: "I have an experience of two years in Python.", wrong: "an experience of two years", right: "two years of experience", why: l3("experience неисчисляемое.", "'Experience' is uncountable.", "experience sanalmaydi."), item: "have-experience" },
    ],
    mission: {
      role: "Sarah, an HR manager at an international software company in IT Park, interviewing a junior developer",
      scene: l3("Переговорная в IT Park", "A meeting room at IT Park", "IT Parkdagi muzokara xonasi"),
      opener: "Hi, thanks for coming! Let's start — tell me a little about yourself.",
      goals: [
        goal("about", ["Расскажите о себе", "Introduce yourself", "Oʻzingizni tanishtiring"], ["i'm ", "i am ", "graduated", "i study", "i live"]),
        goal("experience", ["Опишите опыт", "Describe your experience", "Tajribangizni tasvirlang"], ["experience", "worked", "in charge", "project"]),
        goal("strength", ["Назовите сильную сторону", "Name a strength", "Kuchli tomoningizni ayting"], ["strength", "team player", "learn fast", "good at"]),
        goal("question", ["Задайте вопрос о работе", "Ask about the job", "Ish haqida savol bering"], ["can i ask", "what is", "how big", "team", "?"]),
      ],
      script: [
        "Interesting! What experience do you have?",
        "Good. What would you say is your main strength?",
        "Great answer. Do you have any questions for us?",
        "Thank you! We'll be in touch next week.",
      ],
    },
  },

  // ───────────── 2. Small talk with colleagues ─────────────
  {
    slug: "b1-small-talk",
    level: "B1",
    icon: "MessageCircle",
    title: l3("Small talk с коллегами", "Small talk with colleagues", "Hamkasblar bilan small talk"),
    situation: l3(
      "Утро понедельника: на кухне в офисе вы болтаете с коллегами из Лондона.",
      "Monday morning: you chat with colleagues from London in the office kitchen.",
      "Dushanba ertalab: ofis oshxonasida Londonlik hamkasblar bilan gaplashyapsiz.",
    ),
    canDo: l3(
      "Поддержать лёгкую беседу: выходные, погода, новости — и вовремя закончить разговор.",
      "Keep a light conversation going — weekend, weather, news — and end it naturally.",
      "Yengil suhbatni davom ettirish: dam olish, ob-havo, yangiliklar — va uni tabiiy tugatish.",
    ),
    items: [
      item("how-was-weekend", "How was your weekend?", "fixed", ["как прошли выходные?", "a typical Monday question", "dam olish kunlari qanday oʻtdi?"], ["Morning! How was your weekend?"]),
      item("cant-complain", "Can't complain", "idiom", ["не жалуюсь", "things are fine", "shikoyat qilmayman"], ["How are things? — Can't complain!"], { register: "informal" }),
      item("catch-up", "catch up", "phrasal", ["наверстать / поболтать после перерыва", "to talk and share news after some time", "yangiliklarni gaplashib olmoq"], ["Let's catch up over lunch."]),
      item("by-the-way", "by the way", "fixed", ["кстати", "used to change the topic", "aytgancha"], ["By the way, did you see the new office?"]),
      item("under-the-weather", "feel under the weather", "idiom", ["неважно себя чувствовать", "to feel a bit ill", "biroz betob boʻlmoq"], ["I'm feeling a bit under the weather today."]),
      item("boiling", "It's boiling!", "fixed", ["ужасно жарко!", "it's very hot", "jazirama!"], ["It's boiling today — 42 degrees!"], {
        anti: [
          anti(
            "Today is very hot weather.",
            "It's very hot today.",
            "О погоде говорят через it: It's hot, It's raining.",
            "For weather, start with 'it': It's hot, It's raining.",
            "Ob-havo haqida it bilan boshlanadi: It's hot, It's raining.",
          ),
        ],
      }),
      item("no-way", "No way!", "fixed", ["да ладно! / не может быть!", "surprise or disbelief", "boʻlishi mumkin emas!"], ["You climbed Big Chimgan? No way!"], { register: "informal" }),
      item("get-back-to-work", "I'd better get back to work", "fixed", ["пожалуй, вернусь к работе", "a polite way to end a chat", "ishga qaytsam boʻladi"], ["Anyway, I'd better get back to work. Talk later!"], {
        anti: [
          anti(
            "OK, I must go to work now, bye.",
            "Anyway, I'd better get back to work.",
            "«I must go» звучит резко. Мягче: I'd better get back to work.",
            "'I must go' sounds abrupt. Softer: I'd better get back to work.",
            "«I must go» keskin eshitiladi. Yumshoqroq: I'd better get back to work.",
          ),
        ],
      }),
      item("same-here", "Same here", "fixed", ["у меня тоже", "you feel or did the same", "menda ham"], ["I'm so tired. — Same here!"], { register: "informal" }),
    ],
    exercises: [
      { type: "dialogue", line: "How are things?", options: ["Can't complain!", "I can't complain you.", "Things are how."], answer: 0, item: "cant-complain" },
      { type: "choice", prompt: "___ very hot today.", options: ["Is", "It's", "Weather is"], answer: 1, item: "boiling" },
      { type: "collocate", prompt: "Let's ___ up over lunch.", options: ["catch", "take", "meet"], answer: 0, item: "catch-up" },
      { type: "choice", prompt: "I'm feeling a bit under the ___ today.", options: ["rain", "weather", "sky"], answer: 1, item: "under-the-weather" },
      { type: "dialogue", line: "I'm so tired after the weekend.", options: ["Same here!", "Same for me here.", "Me too here."], answer: 0, item: "same-here" },
      { type: "translate", from: l3("Кстати, ты видел новый офис?", "Change the topic to the new office.", "Aytgancha, yangi ofisni koʻrdingmi?"), answer: "By the way, did you see the new office?", accept: ["By the way, have you seen the new office?"], item: "by-the-way" },
      { type: "order", answer: "Anyway, I'd better get back to work.", hint: l3("Ладно, мне пора работать.", "End the chat politely", "Mayli, ishga qaytay."), item: "get-back-to-work" },
    ],
    mission: {
      role: "Olivia, a friendly colleague from the London office, chatting in the kitchen on Monday morning",
      scene: l3("Офисная кухня, понедельник", "Office kitchen, Monday", "Ofis oshxonasi, dushanba"),
      opener: "Morning! Ugh, Mondays… How was your weekend?",
      goals: [
        goal("weekend", ["Расскажите о выходных", "Talk about your weekend", "Dam olish haqida gapiring"], ["went", "visited", "was ", "we "]),
        goal("ask-back", ["Спросите в ответ", "Ask back", "Qaytib soʻrang"], ["and you", "how about you", "what about you", "?"]),
        goal("react", ["Отреагируйте живо", "React naturally", "Tabiiy munosabat bildiring"], ["no way", "same here", "really", "wow", "nice"]),
        goal("close", ["Вежливо закончите разговор", "Close the chat politely", "Suhbatni muloyim tugating"], ["get back to work", "talk later", "catch up", "see you"]),
      ],
      script: [
        "Oh, lovely! Mine was quiet. I just stayed in because of the heat.",
        "It was 41 degrees on Saturday! Is it always like this in summer?",
        "No way! I need to get used to it. Let's catch up at lunch?",
        "Sounds good. Talk later!",
      ],
    },
  },

  // ───────────── 3. A business email ─────────────
  {
    slug: "b1-business-email",
    level: "B1",
    icon: "PenLine",
    title: l3("Деловое письмо", "Writing a business email", "Ish xati"),
    situation: l3(
      "Вам нужно написать партнёру из Германии: подтвердить встречу и прислать документы.",
      "You need to email a partner in Germany: confirm a meeting and send documents.",
      "Germaniyadagi hamkorga xat yozishingiz kerak: uchrashuvni tasdiqlash va hujjatlarni yuborish.",
    ),
    canDo: l3(
      "Написать короткое вежливое письмо: начало, суть, просьба, завершение.",
      "Write a short polite email: opening, main point, request, closing.",
      "Qisqa muloyim xat yozish: boshlanishi, mazmuni, iltimos, yakuni.",
    ),
    items: [
      item("i-hope", "I hope this email finds you well", "fixed", ["надеюсь, у вас всё хорошо", "a polite email opening", "umid qilamanki, ishlaringiz yaxshi"], ["Dear Mr Weber, I hope this email finds you well."], { register: "formal" }),
      item("writing-to", "I'm writing to …", "fixed", ["пишу, чтобы …", "says the reason for the email", "… uchun yozyapman"], ["I'm writing to confirm our meeting on Tuesday."], { register: "formal" }),
      item("please-find-attached", "Please find attached …", "fixed", ["во вложении …", "says a file is attached", "ilovada …"], ["Please find attached the contract."], {
        register: "formal",
        anti: [
          anti(
            "I attach you the file.",
            "Please find attached the file. / I've attached the file.",
            "attach не берёт «вам» без предлога. Стандарт: Please find attached …",
            "'Attach' doesn't take 'you' directly. Standard: Please find attached …",
            "attach «sizga» ni predlogsiz olmaydi. Standart: Please find attached …",
          ),
        ],
      }),
      item("let-me-know", "let me know", "fixed", ["дайте знать", "tell me", "xabar bering"], ["Please let me know if you have any questions."], {
        anti: [
          anti(
            "Please let me to know.",
            "Please let me know.",
            "После let — глагол без to.",
            "After 'let', use the verb without 'to'.",
            "let dan keyin fe'l to siz keladi.",
          ),
        ],
      }),
      item("follow-up", "follow up on", "phrasal", ["вернуться к (вопросу) / напомнить о", "to continue or check on something", "… boʻyicha qayta murojaat qilmoq"], ["I'm following up on my email from last week."]),
      item("at-your-convenience", "at your earliest convenience", "fixed", ["при первой возможности", "as soon as you can (formal)", "imkon qadar tezroq"], ["Please reply at your earliest convenience."], { register: "formal" }),
      item("look-forward-reply", "I look forward to your reply", "fixed", ["жду вашего ответа", "a polite closing", "javobingizni kutaman"], ["I look forward to your reply."], { register: "formal" }),
      item("kind-regards", "Kind regards", "fixed", ["с уважением", "a standard email sign-off", "hurmat bilan"], ["Kind regards, Nodira"]),
      item("set-up-a-call", "set up a call", "phrasal", ["организовать созвон", "to arrange a phone or video call", "qoʻngʻiroq tashkil qilmoq"], ["Could we set up a call next week?"]),
    ],
    exercises: [
      { type: "choice", prompt: "Please find ___ the contract.", options: ["attach", "attached", "attaching"], answer: 1, item: "please-find-attached" },
      { type: "choice", prompt: "Please let me ___ if you have any questions.", options: ["to know", "know", "knowing"], answer: 1, item: "let-me-know" },
      { type: "gap", prompt: "I'm ___ to confirm our meeting on Tuesday.", answer: "writing", item: "writing-to" },
      { type: "gap", prompt: "I'm following ___ on my email from last week.", answer: "up", item: "follow-up" },
      { type: "collocate", prompt: "Could we ___ up a call next week?", options: ["set", "put", "make"], answer: 0, item: "set-up-a-call" },
      { type: "dialogue", line: "(The last line of a formal email)", options: ["Kind regards, Nodira", "Bye-bye! Nodira", "See ya, Nodira"], answer: 0, item: "kind-regards" },
      { type: "translate", from: l3("Жду вашего ответа.", "End the email politely.", "Javobingizni kutaman."), answer: "I look forward to your reply.", accept: ["I look forward to hearing from you.", "I look forward to your reply"], item: "look-forward-reply" },
      { type: "spot", sentence: "I attach you the presentation.", wrong: "I attach you", right: "Please find attached", why: l3("attach не берёт «вам» напрямую.", "'Attach' doesn't take 'you' directly.", "attach «sizga» ni toʻgʻridan-toʻgʻri olmaydi."), item: "please-find-attached" },
    ],
    mission: {
      role: "Mr Weber, a business partner in Germany, replying to the learner's emails in a short formal style",
      scene: l3("Переписка с партнёром", "An email thread with a partner", "Hamkor bilan yozishma"),
      opener: "Dear colleague, thank you for your message. Could you confirm the date of our meeting and send me the documents?",
      goals: [
        goal("confirm", ["Подтвердите встречу", "Confirm the meeting", "Uchrashuvni tasdiqlang"], ["confirm", "tuesday", "meeting", "date"]),
        goal("attach", ["Сообщите о вложении", "Mention the attachment", "Ilovani eslating"], ["attached", "find attached", "i've attached"]),
        goal("request", ["Попросите о чём-то", "Make a request", "Iltimos qiling"], ["could you", "let me know", "please"]),
        goal("close", ["Закончите письмо формально", "Close formally", "Rasmiy yakunlang"], ["kind regards", "best regards", "look forward"]),
      ],
      script: [
        "Thank you for confirming. Did you attach the documents?",
        "I have received them, thank you. Is there anything you need from my side?",
        "Of course. I will send it by Friday.",
        "Kind regards, Thomas Weber",
      ],
    },
  },

  // ───────────── 4. Negotiating a price ─────────────
  {
    slug: "b1-negotiation",
    level: "B1",
    icon: "Handshake",
    title: l3("Переговоры о цене", "Negotiating a price", "Narx boʻyicha muzokara"),
    situation: l3(
      "Вы фрилансер-дизайнер и обсуждаете с заказчиком цену и сроки проекта.",
      "You're a freelance designer agreeing the price and deadline with a client.",
      "Siz frilanser-dizaynersiz va mijoz bilan loyiha narxi va muddatini kelishyapsiz.",
    ),
    canDo: l3(
      "Назвать цену, обосновать её, предложить компромисс и закрыть сделку.",
      "Name your price, justify it, offer a compromise, and close the deal.",
      "Narxni aytish, asoslash, murosa taklif qilish va kelishuvni yopish.",
    ),
    items: [
      item("budget", "What's your budget?", "fixed", ["какой у вас бюджет?", "asking how much the client can pay", "byudjetingiz qancha?"], ["Before I give you a quote, what's your budget?"]),
      item("give-a-quote", "give a quote", "collocation", ["назвать цену / дать смету", "to say how much a job will cost", "narxini aytmoq"], ["I can give you a quote by tomorrow."]),
      item("meet-halfway", "meet someone halfway", "idiom", ["пойти навстречу / найти компромисс", "to agree to something in the middle", "murosaga kelmoq"], ["Let's meet halfway — 700 dollars?"]),
      item("thats-a-bit-steep", "That's a bit steep", "idiom", ["дороговато", "the price is quite high", "biroz qimmat"], ["1000 dollars? That's a bit steep for us."], { register: "informal" }),
      item("include", "That includes …", "fixed", ["это включает …", "says what is in the price", "bunga … kiradi"], ["That includes two rounds of changes."]),
      item("deal", "It's a deal", "fixed", ["договорились", "you agree", "kelishdik"], ["800 and two weeks? It's a deal!"], {
        anti: [
          anti(
            "OK, we have deal.",
            "OK, it's a deal. / We have a deal.",
            "deal — исчисляемое, нужен артикль: a deal.",
            "'Deal' is countable here — you need 'a'.",
            "deal bu yerda sanaladi — a kerak.",
          ),
        ],
      }),
      item("in-advance", "pay in advance", "collocation", ["платить заранее / предоплата", "to pay before the work is done", "oldindan toʻlamoq"], ["I usually ask for 50% in advance."], {
        anti: [
          anti(
            "Pay me prepayment 50%.",
            "Could you pay 50% in advance?",
            "«Предоплата» естественнее звучит как pay in advance или a deposit.",
            "'Prepayment' is rare in speech; say 'pay in advance' or 'a deposit'.",
            "«Oldindan toʻlov» uchun pay in advance yoki a deposit deyiladi.",
          ),
        ],
      }),
      item("go-over-budget", "go over budget", "phrasal", ["выйти за рамки бюджета", "to spend more than planned", "byudjetdan oshib ketmoq"], ["We can't go over budget this time."]),
      item("think-it-over", "think it over", "phrasal", ["обдумать", "to consider something carefully", "oʻylab koʻrmoq"], ["Let me think it over and get back to you."]),
    ],
    exercises: [
      { type: "collocate", prompt: "I can ___ you a quote by tomorrow.", options: ["give", "make", "say"], answer: 0, item: "give-a-quote" },
      { type: "choice", prompt: "Let's meet ___ — 700 dollars?", options: ["middle", "halfway", "half"], answer: 1, item: "meet-halfway" },
      { type: "dialogue", line: "It's 1,000 dollars for the whole project.", options: ["That's a bit steep for us.", "That's a bit hill.", "It's too much deal."], answer: 0, item: "thats-a-bit-steep" },
      { type: "choice", prompt: "OK, it's ___ deal!", options: ["—", "a", "the"], answer: 1, item: "deal" },
      { type: "gap", prompt: "I usually ask for 50% in ___.", answer: "advance", item: "in-advance" },
      { type: "gap", prompt: "Let me think it ___ and get back to you.", answer: "over", item: "think-it-over" },
      { type: "translate", from: l3("Это включает две правки.", "Say the price has two rounds of changes.", "Bunga ikki marta tuzatish kiradi."), answer: "That includes two rounds of changes.", accept: ["It includes two rounds of changes.", "That includes two rounds of edits."], item: "include" },
      { type: "spot", sentence: "We can't go out of budget.", wrong: "go out of budget", right: "go over budget", why: l3("Устойчиво: go over budget.", "The fixed phrase is 'go over budget'.", "Barqaror ibora: go over budget."), item: "go-over-budget" },
    ],
    mission: {
      role: "Daniel, a startup founder who wants a logo and website design but has a tight budget",
      scene: l3("Видеозвонок с заказчиком", "A video call with a client", "Mijoz bilan videoqoʻngʻiroq"),
      opener: "Hi! So, we need a logo and a simple landing page. How much would that be?",
      goals: [
        goal("price", ["Назовите цену", "Name a price", "Narxni ayting"], ["dollars", "$", "it's ", "quote", "costs"]),
        goal("justify", ["Объясните, что входит", "Explain what's included", "Nima kirishini tushuntiring"], ["includes", "rounds", "changes", "logo and"]),
        goal("compromise", ["Предложите компромисс", "Offer a compromise", "Murosa taklif qiling"], ["halfway", "how about", "discount", "if you"]),
        goal("close", ["Закройте сделку", "Close the deal", "Kelishuvni yoping"], ["deal", "in advance", "agreed", "let's start"]),
      ],
      script: [
        "Hmm, that's a bit steep for us. We're a small startup.",
        "I see. Our budget is around 600 dollars. Can you do anything?",
        "OK, that sounds fair. How do you want to be paid?",
        "It's a deal! I'll send the brief today.",
      ],
    },
  },

  // ───────────── 5. Telling about a trip ─────────────
  {
    slug: "b1-trip-story",
    level: "B1",
    icon: "Plane",
    title: l3("Рассказ о поездке", "Telling a travel story", "Sayohat haqida hikoya"),
    situation: l3(
      "Друг спрашивает о вашей поездке в Хиву — расскажите историю, чтобы ему было интересно.",
      "A friend asks about your trip to Khiva — tell the story so it's interesting.",
      "Doʻstingiz Xivaga sayohatingiz haqida soʻrayapti — qiziqarli qilib hikoya qiling.",
    ),
    canDo: l3(
      "Рассказать историю в прошлом: последовательность, впечатления, неожиданный поворот.",
      "Tell a story in the past: sequence, impressions, an unexpected twist.",
      "Oʻtgan zamonda hikoya qilish: ketma-ketlik, taassurotlar, kutilmagan burilish.",
    ),
    items: [
      item("set-off", "set off", "phrasal", ["отправиться в путь", "to start a journey", "yoʻlga chiqmoq"], ["We set off early in the morning."]),
      item("on-the-way", "on the way", "fixed", ["по дороге", "during the journey", "yoʻlda"], ["On the way, we stopped in Bukhara."]),
      item("breathtaking", "breathtaking views", "collocation", ["захватывающие виды", "extremely beautiful views", "hayratlanarli manzaralar"], ["The views from the minaret were breathtaking."]),
      item("all-of-a-sudden", "all of a sudden", "fixed", ["вдруг", "suddenly", "toʻsatdan"], ["All of a sudden, our car broke down."]),
      item("break-down", "break down", "phrasal", ["сломаться (о машине)", "when a car or machine stops working", "buzilib qolmoq"], ["Our car broke down in the desert."], {
        anti: [
          anti(
            "Our car was broken on the road.",
            "Our car broke down on the way.",
            "Когда машина внезапно перестала работать — break down.",
            "When a car suddenly stops working, it 'breaks down'.",
            "Mashina toʻsatdan ishlamay qolsa — break down.",
          ),
        ],
      }),
      item("turned-out", "it turned out (that)", "phrasal", ["оказалось, что", "used for an unexpected result", "ma'lum boʻlishicha"], ["It turned out the hotel was in the old city."]),
      item("end-up", "end up", "phrasal", ["в итоге оказаться", "to finally be in a place or situation", "oxir-oqibat … boʻlib qolmoq"], ["We ended up staying an extra day."]),
      item("was-worth-it", "It was worth it", "fixed", ["оно того стоило", "the effort was good", "bunga arzirdi"], ["It was a long drive, but it was worth it."], {
        anti: [
          anti(
            "It was cost it.",
            "It was worth it.",
            "«Стоило того» — be worth it, а не cost.",
            "'Worth it' is the phrase, not 'cost it'.",
            "«Arzidi» — be worth it, cost emas.",
          ),
        ],
      }),
      item("go-sightseeing", "go sightseeing", "collocation", ["осматривать достопримечательности", "to visit famous places", "diqqatga sazovor joylarni tomosha qilmoq"], ["We went sightseeing all day."]),
    ],
    exercises: [
      { type: "collocate", prompt: "We ___ off early in the morning.", options: ["set", "put", "got"], answer: 0, item: "set-off" },
      { type: "choice", prompt: "Our car ___ in the desert.", options: ["broke down", "was broken", "broke up"], answer: 0, item: "break-down" },
      { type: "gap", prompt: "It was a long drive, but it was ___ it.", answer: "worth", item: "was-worth-it" },
      { type: "gap", prompt: "We ended ___ staying an extra day.", answer: "up", item: "end-up" },
      { type: "choice", prompt: "It ___ out the hotel was in the old city.", options: ["turned", "came", "went"], answer: 0, item: "turned-out" },
      { type: "translate", from: l3("Виды были захватывающими.", "Describe the amazing views.", "Manzaralar hayratlanarli edi."), answer: "The views were breathtaking.", accept: ["The views were breathtaking", "The view was breathtaking."], item: "breathtaking" },
      { type: "order", answer: "All of a sudden, it started to rain.", hint: l3("Вдруг пошёл дождь.", "Add a sudden twist", "Toʻsatdan yomgʻir yogʻa boshladi."), item: "all-of-a-sudden" },
      { type: "spot", sentence: "The trip was long, but it was cost it.", wrong: "cost it", right: "worth it", why: l3("Стоило того — worth it.", "Worth it, not cost it.", "Arzidi — worth it."), item: "was-worth-it" },
    ],
    mission: {
      role: "Leo, a curious friend from Spain who loves travel stories and asks follow-up questions",
      scene: l3("Вечер в кафе после вашего возвращения", "An evening café chat after your return", "Qaytganingizdan keyin kafedagi kechki suhbat"),
      opener: "You're back! So, how was Khiva? Tell me everything!",
      goals: [
        goal("start", ["Расскажите, как начиналась поездка", "Say how the trip started", "Sayohat qanday boshlanganini ayting"], ["set off", "we went", "flew", "drove", "took a train"]),
        goal("impression", ["Опишите впечатление", "Describe an impression", "Taassurotni tasvirlang"], ["breathtaking", "amazing", "beautiful", "incredible"]),
        goal("twist", ["Добавьте неожиданный поворот", "Add an unexpected twist", "Kutilmagan burilish qoʻshing"], ["all of a sudden", "suddenly", "turned out", "broke down"]),
        goal("ending", ["Закончите историю", "Finish the story", "Hikoyani tugating"], ["ended up", "worth it", "in the end", "finally"]),
      ],
      script: [
        "Wow! What was the best part?",
        "Sounds amazing. Did anything go wrong?",
        "Oh no! So what happened in the end?",
        "What a story! I really want to go now.",
      ],
    },
  },

  // ───────────── 6. Delivery problem ─────────────
  {
    slug: "b1-delivery",
    level: "B1",
    icon: "ShoppingBag",
    title: l3("Проблема с доставкой", "Sorting out a delivery problem", "Yetkazib berish muammosi"),
    situation: l3(
      "Заказ из интернет-магазина пришёл не тот — вы пишете в чат поддержки.",
      "You received the wrong item from an online shop — you contact support chat.",
      "Internet-doʻkondan notoʻgʻri buyurtma keldi — qoʻllab-quvvatlash chatiga yozyapsiz.",
    ),
    canDo: l3(
      "Описать проблему с заказом, привести детали и договориться о возврате или замене.",
      "Describe an order problem, give details, and agree on a refund or replacement.",
      "Buyurtma muammosini tasvirlash, tafsilot berish va qaytarish yoki almashtirishni kelishish.",
    ),
    items: [
      item("order-number", "my order number is …", "fixed", ["номер моего заказа …", "the code of your order", "buyurtma raqamim …"], ["My order number is 48213."]),
      item("wrong-item", "I received the wrong item", "fixed", ["мне пришёл не тот товар", "you got something you didn't order", "notoʻgʻri mahsulot keldi"], ["I received the wrong item — I ordered a blue one."]),
      item("hasnt-arrived", "hasn't arrived yet", "fixed", ["ещё не пришёл", "it's still not here", "hali kelmadi"], ["My parcel hasn't arrived yet."], {
        anti: [
          anti(
            "My parcel didn't come still.",
            "My parcel still hasn't arrived.",
            "Для «до сих пор не» — Present Perfect с still / yet.",
            "For 'still not', use the present perfect with still / yet.",
            "«Hali ham …madi» uchun Present Perfect + still / yet.",
          ),
        ],
      }),
      item("get-a-refund", "get a refund", "collocation", ["получить возврат денег", "to get your money back", "pulni qaytarib olmoq"], ["Can I get a refund?"], {
        anti: [
          anti(
            "I want to return my money.",
            "I'd like a refund.",
            "Возврат денег — a refund. Return — вернуть сам товар.",
            "Money back is 'a refund'; you 'return' the item.",
            "Pulni qaytarish — refund. Return — mahsulotni qaytarish.",
          ),
        ],
      }),
      item("replacement", "send a replacement", "collocation", ["прислать замену", "to send a new item instead", "almashtiruvchi mahsulot yubormoq"], ["Could you send a replacement?"]),
      item("damaged", "arrived damaged", "collocation", ["пришёл повреждённым", "it was broken on arrival", "shikastlangan holda keldi"], ["The screen arrived damaged."]),
      item("frustrating", "That's really frustrating", "fixed", ["это очень неприятно", "you are unhappy and annoyed", "bu juda achinarli"], ["I've waited two weeks. That's really frustrating."]),
      item("sort-it-out", "How can we sort this out?", "fixed", ["как мы можем это решить?", "asking for a solution", "buni qanday hal qilamiz?"], ["How can we sort this out today?"]),
      item("send-back", "send it back", "phrasal", ["отправить обратно", "to return an item by post", "qaytarib yubormoq"], ["Do I need to send it back?"]),
    ],
    exercises: [
      { type: "choice", prompt: "My parcel ___ yet.", options: ["didn't arrive", "hasn't arrived", "not arrived"], answer: 1, item: "hasnt-arrived" },
      { type: "collocate", prompt: "Can I ___ a refund?", options: ["get", "take back", "make"], answer: 0, item: "get-a-refund" },
      { type: "collocate", prompt: "Could you ___ a replacement?", options: ["send", "give back", "do"], answer: 0, item: "replacement" },
      { type: "gap", prompt: "Do I need to send it ___?", answer: "back", item: "send-back" },
      { type: "dialogue", line: "Hello! How can I help you today?", options: ["I received the wrong item. My order number is 48213.", "Wrong! Give my money.", "I want return money."], answer: 0, item: "wrong-item" },
      { type: "translate", from: l3("Экран пришёл повреждённым.", "Report a broken screen.", "Ekran shikastlangan holda keldi."), answer: "The screen arrived damaged.", accept: ["The screen arrived damaged", "The screen came damaged."], item: "damaged" },
      { type: "order", answer: "How can we sort this out?", hint: l3("Как мы можем это решить?", "Ask for a solution", "Buni qanday hal qilamiz?"), item: "sort-it-out" },
      { type: "spot", sentence: "I want to return my money for the shoes.", wrong: "return my money", right: "get a refund", why: l3("Деньги — refund.", "Money back — a refund.", "Pul — refund."), item: "get-a-refund" },
    ],
    mission: {
      role: "Alex, a support agent of an online electronics shop chatting with a customer",
      scene: l3("Чат поддержки интернет-магазина", "An online shop's support chat", "Internet-doʻkon qoʻllab-quvvatlash chati"),
      opener: "Hi there! This is Alex from support. How can I help you today?",
      goals: [
        goal("problem", ["Опишите проблему", "Describe the problem", "Muammoni tasvirlang"], ["wrong item", "damaged", "hasn't arrived", "received"]),
        goal("details", ["Дайте номер заказа", "Give the order number", "Buyurtma raqamini bering"], ["order number", "number is", "#"]),
        goal("feelings", ["Покажите недовольство вежливо", "Show you're unhappy, politely", "Norozilikni muloyim bildiring"], ["frustrating", "disappointed", "not happy"]),
        goal("solution", ["Договоритесь о решении", "Agree on a solution", "Yechimga kelishing"], ["refund", "replacement", "send it back", "sort"]),
      ],
      script: [
        "I'm sorry to hear that. Could you give me your order number?",
        "Thanks. I can see the problem. I'm really sorry for the trouble.",
        "We can send a replacement or give you a full refund. Which do you prefer?",
        "Done! You don't need to send it back. Have a great day!",
      ],
    },
  },
];
