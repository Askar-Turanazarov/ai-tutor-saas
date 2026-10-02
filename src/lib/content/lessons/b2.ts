import type { LessonSeed } from "../types";
import { anti, goal, item, l3 } from "./helpers";

export const B2_LESSONS: LessonSeed[] = [
  // ───────────── 1. Presenting a project ─────────────
  {
    slug: "b2-presentation",
    level: "B2",
    icon: "Rocket",
    title: l3("Презентация проекта", "Presenting a project", "Loyiha taqdimoti"),
    situation: l3(
      "Вы презентуете свой стартап инвесторам на демо-дне в Ташкенте.",
      "You pitch your startup to investors at a demo day in Tashkent.",
      "Toshkentdagi demo-kunda startapingizni investorlarga taqdim qilyapsiz.",
    ),
    canDo: l3(
      "Выстроить структуру выступления, показать цифры и ответить на трудный вопрос.",
      "Structure a talk, present figures, and handle a tough question.",
      "Nutqni tuzish, raqamlarni koʻrsatish va qiyin savolga javob berish.",
    ),
    items: [
      item("walk-through", "walk you through", "phrasal", ["подробно показать / провести по", "to explain something step by step", "bosqichma-bosqich tushuntirmoq"], ["Let me walk you through our product."]),
      item("in-a-nutshell", "in a nutshell", "idiom", ["в двух словах", "in a very short summary", "qisqa qilib aytganda"], ["In a nutshell, we help students find tutors."]),
      item("pain-point", "a pain point", "collocation", ["болевая точка", "a problem that bothers customers", "mijozlarning ogʻriqli nuqtasi"], ["The main pain point is the high price of tutors."]),
      item("grew-by", "grow by 30%", "collocation", ["вырасти на 30%", "to increase by an amount", "30% ga oʻsmoq"], ["Our revenue grew by 30% last quarter."], {
        anti: [
          anti(
            "Our sales grew on 30%.",
            "Our sales grew by 30%.",
            "Изменение на сколько-то — by, не on.",
            "Change by an amount uses 'by', not 'on'.",
            "Biror miqdorga oʻzgarish — by, on emas.",
          ),
        ],
      }),
      item("move-on-to", "move on to", "phrasal", ["перейти к", "to start talking about the next topic", "…ga oʻtmoq"], ["Let's move on to the numbers."]),
      item("game-changer", "a game changer", "idiom", ["то, что меняет правила игры", "something that changes a situation completely", "vaziyatni butunlay oʻzgartiruvchi narsa"], ["AI feedback was a real game changer for us."]),
      item("good-question", "That's a good question", "fixed", ["хороший вопрос", "buys you time before answering", "yaxshi savol"], ["That's a good question. Let me explain."]),
      item("to-sum-up", "to sum up", "fixed", ["подводя итог", "used before a summary", "xulosa qilib aytganda"], ["To sum up, we're growing fast and need your support."]),
      item("raise-funds", "raise funds", "collocation", ["привлечь инвестиции", "to get money from investors", "mablagʻ jalb qilmoq"], ["We're looking to raise 200,000 dollars."], {
        anti: [
          anti(
            "We want to attract investments of 200k.",
            "We're looking to raise 200k.",
            "Естественнее: raise money / funds / a round.",
            "More natural: raise money / funds / a round.",
            "Tabiiyroq: raise money / funds / a round.",
          ),
        ],
      }),
    ],
    exercises: [
      { type: "collocate", prompt: "Our revenue grew ___ 30% last quarter.", options: ["on", "by", "for"], answer: 1, item: "grew-by" },
      { type: "choice", prompt: "In a ___, we help students find tutors.", options: ["nutshell", "shell", "word"], answer: 0, item: "in-a-nutshell" },
      { type: "gap", prompt: "Let me walk you ___ our product.", answer: "through", item: "walk-through" },
      { type: "gap", prompt: "Let's move ___ to the numbers.", answer: "on", item: "move-on-to" },
      { type: "collocate", prompt: "We're looking to ___ 200,000 dollars.", options: ["attract", "raise", "collect up"], answer: 1, item: "raise-funds" },
      { type: "dialogue", line: "Why would anyone pay for this if there are free apps?", options: ["That's a good question. Let me explain.", "This is stupid question.", "I don't know, next."], answer: 0, item: "good-question" },
      { type: "translate", from: l3("Подводя итог, мы быстро растём.", "Sum up your growth.", "Xulosa qilib aytganda, biz tez oʻsyapmiz."), answer: "To sum up, we're growing fast.", accept: ["To sum up, we are growing fast.", "To sum up, we're growing quickly."], item: "to-sum-up" },
      { type: "spot", sentence: "AI feedback was a real game change for us.", wrong: "game change", right: "game changer", why: l3("Идиома — a game changer.", "The idiom is 'a game changer'.", "Ibora — a game changer."), item: "game-changer" },
    ],
    mission: {
      role: "Ms Karimova, a sharp but fair investor at a Tashkent startup demo day",
      scene: l3("Сцена демо-дня, 5 минут на питч", "Demo day stage, five minutes to pitch", "Demo-kun sahnasi, pitch uchun 5 daqiqa"),
      opener: "Welcome! You have five minutes. What problem are you solving?",
      goals: [
        goal("problem", ["Опишите проблему", "Describe the problem", "Muammoni tasvirlang"], ["pain point", "problem", "students", "users"]),
        goal("numbers", ["Покажите цифры", "Show numbers", "Raqamlarni koʻrsating"], ["grew by", "%", "users", "revenue"]),
        goal("tough", ["Ответьте на трудный вопрос", "Handle a tough question", "Qiyin savolga javob bering"], ["good question", "let me explain", "the difference"]),
        goal("ask", ["Назовите, что вам нужно", "Say what you need", "Nima kerakligini ayting"], ["raise", "looking for", "investment", "funds"]),
      ],
      script: [
        "Interesting. Do you have any traction yet?",
        "Not bad. But why would people pay when there are free apps?",
        "Fair point. So what exactly are you asking for?",
        "Thank you. Let's talk after the session.",
      ],
    },
  },

  // ───────────── 2. Disagreeing diplomatically ─────────────
  {
    slug: "b2-disagree",
    level: "B2",
    icon: "Scale",
    title: l3("Дипломатичное несогласие", "Disagreeing diplomatically", "Diplomatik e'tiroz"),
    situation: l3(
      "На планёрке менеджер предлагает сорвать сроки ради новой фичи — вы не согласны.",
      "At a team meeting a manager wants to push a deadline for a new feature — you disagree.",
      "Yigʻilishda menejer yangi funksiya uchun muddatni surishni taklif qilyapti — siz rozi emassiz.",
    ),
    canDo: l3(
      "Вежливо не согласиться, привести аргумент и предложить альтернативу.",
      "Disagree politely, give a reason, and suggest an alternative.",
      "Muloyim e'tiroz bildirish, dalil keltirish va muqobil taklif qilish.",
    ),
    items: [
      item("see-your-point", "I see your point, but …", "fixed", ["понимаю вашу мысль, но …", "a soft way to start disagreeing", "fikringizni tushunaman, lekin …"], ["I see your point, but the deadline is very close."]),
      item("not-sure-about", "I'm not sure about that", "fixed", ["я не уверен насчёт этого", "a polite 'I disagree'", "bunga ishonchim komil emas"], ["I'm not sure about that approach."], {
        anti: [
          anti(
            "You are wrong.",
            "I'm not sure I agree with that.",
            "«You are wrong» звучит конфликтно. В рабочей речи несогласие смягчают.",
            "'You are wrong' sounds aggressive. At work, soften disagreement.",
            "«You are wrong» keskin eshitiladi. Ishda e'tiroz yumshatiladi.",
          ),
        ],
      }),
      item("on-the-other-hand", "on the other hand", "fixed", ["с другой стороны", "introduces the opposite view", "boshqa tomondan"], ["On the other hand, users are asking for it."]),
      item("play-devils-advocate", "play devil's advocate", "idiom", ["играть роль адвоката дьявола", "to argue the other side to test an idea", "qarama-qarshi fikrni himoya qilib koʻrmoq"], ["Let me play devil's advocate for a second."]),
      item("bear-in-mind", "bear in mind", "fixed", ["иметь в виду", "to remember and consider", "yodda tutmoq"], ["Bear in mind that we have only two developers."]),
      item("what-if", "What if we …?", "fixed", ["а что если мы …?", "suggests an alternative", "agar biz … qilsak-chi?"], ["What if we release a simple version first?"]),
      item("agree-to-disagree", "agree to disagree", "idiom", ["остаться при своих мнениях", "to accept you have different opinions", "har kim oʻz fikrida qolmoq"], ["I think we'll have to agree to disagree."]),
      item("fair-point", "That's a fair point", "fixed", ["справедливое замечание", "you accept part of the other view", "oʻrinli fikr"], ["That's a fair point. Still, I think …"]),
      item("push-back", "push back (a deadline)", "phrasal", ["перенести (срок) на позже", "to move to a later time", "muddatni surmoq"], ["We can't push back the release again."], {
        anti: [
          anti(
            "Let's move back the deadline to forward.",
            "Let's push back the deadline.",
            "Перенести на позже — push back (или postpone).",
            "To move to a later date — push back (or postpone).",
            "Keyinroqqa surish — push back (yoki postpone).",
          ),
        ],
      }),
    ],
    exercises: [
      { type: "dialogue", line: "I think we should add the feature and delay the release.", options: ["I see your point, but the deadline is very close.", "You are wrong.", "No. Bad idea."], answer: 0, item: "see-your-point" },
      { type: "choice", prompt: "___ in mind that we have only two developers.", options: ["Bear", "Keep up", "Hold"], answer: 0, item: "bear-in-mind" },
      { type: "collocate", prompt: "We can't ___ back the release again.", options: ["push", "move up", "put on"], answer: 0, item: "push-back" },
      { type: "gap", prompt: "What ___ we release a simple version first?", answer: "if", item: "what-if" },
      { type: "choice", prompt: "Let me play devil's ___ for a second.", options: ["lawyer", "advocate", "friend"], answer: 1, item: "play-devils-advocate" },
      { type: "translate", from: l3("Справедливое замечание.", "Accept part of their view.", "Oʻrinli fikr."), answer: "That's a fair point.", accept: ["That is a fair point.", "Fair point."], item: "fair-point" },
      { type: "order", answer: "I think we'll have to agree to disagree.", hint: l3("Думаю, останемся при своих мнениях.", "End the argument politely", "Menimcha, har kim oʻz fikrida qoladi."), item: "agree-to-disagree" },
      { type: "spot", sentence: "On other hand, users are asking for it.", wrong: "On other hand", right: "On the other hand", why: l3("Нужен артикль: on the other hand.", "You need 'the': on the other hand.", "the kerak: on the other hand."), item: "on-the-other-hand" },
    ],
    mission: {
      role: "Mark, a product manager who insists on adding a new feature before the release",
      scene: l3("Планёрка команды", "A team meeting", "Jamoa yigʻilishi"),
      opener: "OK team, I want to add dark mode before Friday's release. Thoughts?",
      goals: [
        goal("soft-no", ["Мягко не согласитесь", "Disagree softly", "Yumshoq e'tiroz bildiring"], ["i see your point", "not sure", "i'm afraid", "i understand"]),
        goal("reason", ["Приведите аргумент", "Give a reason", "Dalil keltiring"], ["bear in mind", "because", "deadline", "only two"]),
        goal("alternative", ["Предложите альтернативу", "Suggest an alternative", "Muqobil taklif qiling"], ["what if", "how about", "instead", "next release"]),
        goal("acknowledge", ["Признайте его аргумент", "Acknowledge his point", "Uning fikrini tan oling"], ["fair point", "that's true", "you're right that"]),
      ],
      script: [
        "Hmm, but users keep asking for dark mode. Why not?",
        "I get that. But don't you think it's worth the risk?",
        "That's actually not a bad idea. What about the users who asked?",
        "OK, fair enough. Let's do it your way.",
      ],
    },
  },

  // ───────────── 3. Giving feedback to a client ─────────────
  {
    slug: "b2-client-feedback",
    level: "B2",
    icon: "MessageCircle",
    title: l3("Отзыв клиенту", "Giving feedback to a client", "Mijozga fikr bildirish"),
    situation: l3(
      "Клиент прислал свой текст для сайта — нужно тактично объяснить, что его стоит переписать.",
      "A client sent their website copy — you need to tactfully explain it should be rewritten.",
      "Mijoz sayt uchun matnini yubordi — uni qayta yozish kerakligini xushmuomalalik bilan tushuntirish kerak.",
    ),
    canDo: l3(
      "Дать конструктивную обратную связь: похвала, конкретная проблема, предложение.",
      "Give constructive feedback: praise, a specific problem, a suggestion.",
      "Konstruktiv fikr bildirish: maqtov, aniq muammo, taklif.",
    ),
    items: [
      item("overall", "Overall, …", "fixed", ["в целом, …", "a general opinion first", "umuman olganda, …"], ["Overall, the text is clear and friendly."]),
      item("room-for-improvement", "there's room for improvement", "fixed", ["есть что улучшить", "it could be better", "yaxshilash uchun joy bor"], ["There's still some room for improvement in the intro."]),
      item("come-across", "come across as", "phrasal", ["производить впечатление", "to seem a certain way to others", "… boʻlib koʻrinmoq"], ["The headline comes across as a bit aggressive."]),
      item("i-would-suggest", "I'd suggest …-ing", "fixed", ["я бы предложил …", "a polite suggestion", "… taklif qilardim"], ["I'd suggest cutting the first paragraph."], {
        anti: [
          anti(
            "I suggest you to cut it.",
            "I'd suggest cutting it. / I suggest (that) you cut it.",
            "После suggest нельзя «you to do». Нужно -ing или that-клауза.",
            "'Suggest' can't take 'you to do'. Use -ing or a that-clause.",
            "suggest dan keyin «you to do» boʻlmaydi. -ing yoki that ishlatiladi.",
          ),
        ],
      }),
      item("spot-on", "spot on", "idiom", ["в точку", "exactly right", "aynan toʻgʻri"], ["Your tone is spot on for young users."], { register: "informal" }),
      item("a-bit-wordy", "a bit wordy", "collocation", ["многословно", "uses too many words", "biroz uzun-uzun"], ["The 'About us' page is a bit wordy."]),
      item("tone-down", "tone down", "phrasal", ["смягчить", "to make something less strong", "yumshatmoq"], ["Maybe we could tone down the sales language."]),
      item("on-the-right-track", "on the right track", "idiom", ["на верном пути", "doing something in the right way", "toʻgʻri yoʻlda"], ["You're definitely on the right track."]),
      item("what-do-you-think", "How do you feel about …?", "fixed", ["как вы относитесь к …?", "asks for the other person's opinion", "… haqida qanday fikrdasiz?"], ["How do you feel about a shorter version?"]),
    ],
    exercises: [
      { type: "choice", prompt: "I'd suggest ___ the first paragraph.", options: ["to cut", "cutting", "you to cut"], answer: 1, item: "i-would-suggest" },
      { type: "collocate", prompt: "The headline ___ across as a bit aggressive.", options: ["comes", "goes", "looks"], answer: 0, item: "come-across" },
      { type: "gap", prompt: "Maybe we could tone ___ the sales language.", answer: "down", item: "tone-down" },
      { type: "choice", prompt: "You're definitely on the right ___.", options: ["way", "road", "track"], answer: 2, item: "on-the-right-track" },
      { type: "dialogue", line: "So, what do you think of my text?", options: ["Overall, it's clear, but there's some room for improvement.", "It's bad, rewrite it.", "I suggest you to rewrite."], answer: 0, item: "overall" },
      { type: "translate", from: l3("Тон в точку.", "Say the tone is exactly right.", "Ohang aynan toʻgʻri."), answer: "The tone is spot on.", accept: ["Your tone is spot on.", "The tone is spot on"], item: "spot-on" },
      { type: "order", answer: "How do you feel about a shorter version?", hint: l3("Как вы смотрите на более короткую версию?", "Ask their opinion", "Qisqaroq variant haqida qanday fikrdasiz?"), item: "what-do-you-think" },
      { type: "spot", sentence: "I suggest you to make it shorter.", wrong: "suggest you to make", right: "suggest making", why: l3("После suggest — -ing или that.", "After 'suggest' — -ing or that.", "suggest dan keyin — -ing yoki that."), item: "i-would-suggest" },
    ],
    mission: {
      role: "Mrs Ahmedova, the owner of a family hotel who wrote her own website text and is a little sensitive about it",
      scene: l3("Онлайн-созвон с клиентом", "An online call with a client", "Mijoz bilan onlayn qoʻngʻiroq"),
      opener: "I worked very hard on that text. So, be honest — what do you think?",
      goals: [
        goal("praise", ["Начните с похвалы", "Start with praise", "Maqtovdan boshlang"], ["overall", "i like", "spot on", "great", "right track"]),
        goal("issue", ["Назовите конкретную проблему", "Name a specific issue", "Aniq muammoni ayting"], ["wordy", "comes across", "room for improvement", "too long"]),
        goal("suggest", ["Предложите улучшение", "Suggest an improvement", "Yaxshilashni taklif qiling"], ["i'd suggest", "maybe we could", "tone down", "what if"]),
        goal("check", ["Спросите её мнение", "Ask her opinion", "Uning fikrini soʻrang"], ["how do you feel", "what do you think", "does that sound"]),
      ],
      script: [
        "Oh, thank you! But I feel there's a 'but' coming…",
        "Hmm. I see. So what would you change exactly?",
        "That makes sense, actually.",
        "OK, I trust you. Let's try your version.",
      ],
    },
  },

  // ───────────── 4. Discussing the news ─────────────
  {
    slug: "b2-news",
    level: "B2",
    icon: "Newspaper",
    title: l3("Обсуждение новостей", "Discussing the news", "Yangiliklarni muhokama qilish"),
    situation: l3(
      "За обедом коллеги обсуждают новость о запрете бензиновых машин в центре Ташкента.",
      "Over lunch colleagues discuss news about banning petrol cars in central Tashkent.",
      "Tushlikda hamkasblar Toshkent markazida benzinli mashinalarni taqiqlash haqidagi yangilikni muhokama qilyapti.",
    ),
    canDo: l3(
      "Пересказать новость, высказать мнение с оговорками и взвесить плюсы и минусы.",
      "Report a news story, give a hedged opinion, and weigh pros and cons.",
      "Yangilikni aytib berish, ehtiyotkor fikr bildirish va ijobiy-salbiy tomonlarni tortish.",
    ),
    items: [
      item("apparently", "apparently", "word", ["судя по всему / говорят", "it seems, based on what you heard", "aftidan"], ["Apparently, the ban starts next year."]),
      item("according-to", "according to", "fixed", ["по данным / согласно", "says where information comes from", "…ga koʻra"], ["According to Kun.uz, the project costs a lot."], {
        anti: [
          anti(
            "According to me, it's a good idea.",
            "In my opinion, it's a good idea.",
            "according to — о чужом источнике. О своём мнении: in my opinion / I think.",
            "'According to' is for other sources. For yourself: in my opinion.",
            "according to — boshqa manba uchun. Oʻz fikringiz: in my opinion.",
          ),
        ],
      }),
      item("make-headlines", "make headlines", "collocation", ["попасть в заголовки", "to be big news", "sarlavhalarga chiqmoq"], ["The story made headlines everywhere."]),
      item("pros-and-cons", "the pros and cons", "fixed", ["плюсы и минусы", "advantages and disadvantages", "afzallik va kamchiliklar"], ["Let's think about the pros and cons."]),
      item("in-the-long-run", "in the long run", "idiom", ["в долгосрочной перспективе", "over a long time", "uzoq muddatda"], ["In the long run, it'll be good for the air."]),
      item("i-tend-to-think", "I tend to think …", "fixed", ["я склонен думать …", "a soft, hedged opinion", "… deb oʻylashga moyilman"], ["I tend to think it's a step in the right direction."]),
      item("a-double-edged-sword", "a double-edged sword", "idiom", ["палка о двух концах", "something with both good and bad results", "ikki tomonlama qilich"], ["Cheap taxis are a double-edged sword."]),
      item("raise-concerns", "raise concerns", "collocation", ["вызывать опасения", "to make people worried", "xavotir uygʻotmoq"], ["The plan has raised concerns among drivers."], {
        anti: [
          anti(
            "The plan rose concerns.",
            "The plan raised concerns.",
            "raise (что-то) — переходный; rise — непереходный (rise, rose, risen).",
            "'Raise' takes an object; 'rise' doesn't (rise, rose, risen).",
            "raise — oʻtimli; rise — oʻtimsiz (rise, rose, risen).",
          ),
        ],
      }),
      item("its-hard-to-say", "It's hard to say", "fixed", ["сложно сказать", "you're not sure", "aytish qiyin"], ["Will it work? It's hard to say."]),
    ],
    exercises: [
      { type: "choice", prompt: "___ Kun.uz, the project is very expensive.", options: ["According to", "According", "By opinion of"], answer: 0, item: "according-to" },
      { type: "choice", prompt: "___, it's a good idea. (your opinion)", options: ["According to me", "In my opinion", "On my opinion"], answer: 1, item: "according-to" },
      { type: "collocate", prompt: "The plan has ___ concerns among drivers.", options: ["rised", "raised", "rose"], answer: 1, item: "raise-concerns" },
      { type: "collocate", prompt: "The story ___ headlines everywhere.", options: ["did", "made", "took"], answer: 1, item: "make-headlines" },
      { type: "gap", prompt: "In the long ___, it'll be good for the air.", answer: "run", item: "in-the-long-run" },
      { type: "choice", prompt: "Cheap taxis are a ___ sword.", options: ["two-sided", "double-edged", "double-sided"], answer: 1, item: "a-double-edged-sword" },
      { type: "translate", from: l3("Сложно сказать.", "Say you're not sure.", "Aytish qiyin."), answer: "It's hard to say.", accept: ["It is hard to say.", "Hard to say."], item: "its-hard-to-say" },
      { type: "order", answer: "Apparently, the ban starts next year.", hint: l3("Говорят, запрет начнётся в следующем году.", "Report what you heard", "Aytishlaricha, taqiq kelasi yildan boshlanadi."), item: "apparently" },
    ],
    mission: {
      role: "Kamola, a colleague with strong opinions who loves debating the news over lunch",
      scene: l3("Обед в офисной столовой", "Lunch in the office canteen", "Ofis oshxonasida tushlik"),
      opener: "Did you see the news? They want to ban petrol cars in the city centre! Crazy, right?",
      goals: [
        goal("report", ["Перескажите, что слышали", "Report what you heard", "Eshitganingizni aytib bering"], ["apparently", "according to", "i read", "i heard"]),
        goal("opinion", ["Выскажите мнение осторожно", "Give a hedged opinion", "Ehtiyotkor fikr bildiring"], ["i tend to think", "in my opinion", "it's hard to say", "i'd say"]),
        goal("balance", ["Взвесьте плюсы и минусы", "Weigh pros and cons", "Ijobiy va salbiy tomonlarni tarozilang"], ["pros and cons", "double-edged", "on the other hand", "in the long run"]),
        goal("ask", ["Спросите её мнение", "Ask her view", "Uning fikrini soʻrang"], ["what do you think", "how about you", "do you think"]),
      ],
      script: [
        "Really? I didn't know that detail.",
        "Hmm, but what about people who can't afford electric cars?",
        "That's true. I think it's mostly a bad idea, to be honest.",
        "Well, I guess we'll see. Want some more tea?",
      ],
    },
  },

  // ───────────── 5. Networking ─────────────
  {
    slug: "b2-networking",
    level: "B2",
    icon: "Users",
    title: l3("Нетворкинг", "Networking at an event", "Tadbirda tanishuvlar"),
    situation: l3(
      "Вы на международной IT-конференции и хотите познакомиться с нужным человеком.",
      "You're at an international IT conference and want to meet a useful contact.",
      "Xalqaro IT-konferensiyadasiz va kerakli odam bilan tanishmoqchisiz.",
    ),
    canDo: l3(
      "Начать разговор с незнакомцем, рассказать о себе коротко и обменяться контактами.",
      "Start a conversation with a stranger, pitch yourself briefly, and exchange contacts.",
      "Notanish odam bilan suhbat boshlash, oʻzingizni qisqa tanishtirish va kontakt almashish.",
    ),
    items: [
      item("mind-if-i-join", "Mind if I join you?", "fixed", ["не возражаете, если я присоединюсь?", "a polite way to join a group", "qoʻshilsam maylimi?"], ["Hi! Mind if I join you?"]),
      item("enjoying", "Are you enjoying the conference?", "fixed", ["как вам конференция?", "an easy opening question", "konferensiya yoqyaptimi?"], ["So, are you enjoying the conference so far?"]),
      item("break-the-ice", "break the ice", "idiom", ["растопить лёд", "to make people feel relaxed at first", "muzni eritmoq"], ["A joke can help break the ice."]),
      item("what-brings-you", "What brings you here?", "fixed", ["что привело вас сюда?", "asking why someone came", "sizni bu yerga nima olib keldi?"], ["What brings you to Tashkent?"]),
      item("work-in", "I work in …", "fixed", ["я работаю в сфере …", "says your field", "… sohasida ishlayman"], ["I work in fintech."], {
        anti: [
          anti(
            "I'm working in the fintech sphere.",
            "I work in fintech.",
            "Слово sphere в таком значении звучит как калька. Просто: work in fintech / in the fintech industry.",
            "'Sphere' sounds like a direct translation. Just say: work in fintech / the fintech industry.",
            "sphere bu ma'noda kalka. Oddiy: work in fintech / the fintech industry.",
          ),
        ],
      }),
      item("keep-in-touch", "keep in touch", "fixed", ["оставаться на связи", "to continue communicating", "aloqada boʻlmoq"], ["Let's keep in touch!"]),
      item("reach-out", "reach out", "phrasal", ["связаться / написать", "to contact someone", "bogʻlanmoq"], ["Feel free to reach out on LinkedIn."]),
      item("swap-contacts", "swap contacts", "collocation", ["обменяться контактами", "to give each other your details", "kontakt almashmoq"], ["Shall we swap contacts?"]),
      item("pleasure-talking", "It was a pleasure talking to you", "fixed", ["было приятно пообщаться", "a polite goodbye", "siz bilan suhbatlashish yoqimli boʻldi"], ["It was a pleasure talking to you. Enjoy the rest of the event!"], {
        anti: [
          anti(
            "It was pleasure to talk with you.",
            "It was a pleasure talking to you.",
            "Нужен артикль: a pleasure.",
            "You need 'a': a pleasure.",
            "a kerak: a pleasure.",
          ),
        ],
      }),
    ],
    exercises: [
      { type: "dialogue", line: "(You see a group talking near the coffee.)", options: ["Hi! Mind if I join you?", "Hey, I'm joining.", "Can I to join you?"], answer: 0, item: "mind-if-i-join" },
      { type: "choice", prompt: "I work ___ fintech.", options: ["in", "in the sphere of", "at the"], answer: 0, item: "work-in" },
      { type: "collocate", prompt: "A joke can help ___ the ice.", options: ["break", "melt", "crash"], answer: 0, item: "break-the-ice" },
      { type: "gap", prompt: "Feel free to reach ___ on LinkedIn.", answer: "out", item: "reach-out" },
      { type: "choice", prompt: "It was ___ pleasure talking to you.", options: ["—", "a", "the"], answer: 1, item: "pleasure-talking" },
      { type: "translate", from: l3("Давайте оставаться на связи!", "Suggest staying in contact.", "Aloqada boʻlaylik!"), answer: "Let's keep in touch!", accept: ["Let's keep in touch", "Let us keep in touch!"], item: "keep-in-touch" },
      { type: "order", answer: "What brings you to Tashkent?", hint: l3("Что привело вас в Ташкент?", "Ask why they came", "Sizni Toshkentga nima olib keldi?"), item: "what-brings-you" },
    ],
    mission: {
      role: "David, a CTO from a Berlin startup visiting a Tashkent tech conference, open to meeting new people",
      scene: l3("Кофе-брейк на IT-конференции", "Coffee break at a tech conference", "IT-konferensiyada kofe-breyk"),
      opener: "(David is standing alone with a coffee, looking at his phone.)",
      goals: [
        goal("open", ["Начните разговор", "Start the conversation", "Suhbatni boshlang"], ["mind if", "enjoying", "hi", "excuse me"]),
        goal("ask", ["Узнайте, что привело его", "Ask what brings him here", "Uni nima olib kelganini soʻrang"], ["what brings", "why are you", "where are you from"]),
        goal("pitch", ["Коротко расскажите о себе", "Briefly pitch yourself", "Oʻzingizni qisqa tanishtiring"], ["i work in", "i'm a", "my company", "i build"]),
        goal("contacts", ["Обменяйтесь контактами", "Exchange contacts", "Kontakt almashing"], ["keep in touch", "linkedin", "swap", "reach out", "contact"]),
      ],
      script: [
        "Oh, hi! Sure. Yes, the talks are great so far.",
        "I'm looking for developers — we want to open an office in Central Asia. And you?",
        "That's interesting! We might need people like you.",
        "Absolutely. It was a pleasure talking to you!",
      ],
    },
  },

  // ───────────── 6. Complaint and compensation ─────────────
  {
    slug: "b2-compensation",
    level: "B2",
    icon: "Plane",
    title: l3("Жалоба и компенсация", "Claiming compensation", "Shikoyat va kompensatsiya"),
    situation: l3(
      "Рейс отменили, вы пропустили стыковку — требуете у авиакомпании компенсацию.",
      "Your flight was cancelled and you missed a connection — you claim compensation from the airline.",
      "Reys bekor qilindi, ulanishdan qoldingiz — aviakompaniyadan kompensatsiya talab qilyapsiz.",
    ),
    canDo: l3(
      "Твёрдо, но вежливо изложить претензию, сослаться на права и добиться результата.",
      "Make a firm but polite complaint, refer to your rights, and get a result.",
      "Qat'iy, ammo muloyim shikoyat qilish, huquqlaringizga tayanish va natijaga erishish.",
    ),
    items: [
      item("i-wish-to-complain", "I'd like to make a complaint", "fixed", ["я хочу подать жалобу", "a formal start to a complaint", "shikoyat qilmoqchiman"], ["I'd like to make a complaint about my flight."], {
        register: "formal",
        anti: [
          anti(
            "I want to do a complaint.",
            "I'd like to make a complaint.",
            "Жалобу «делают» глаголом make.",
            "You 'make' a complaint.",
            "Shikoyat make bilan qilinadi.",
          ),
        ],
      }),
      item("unacceptable", "This is unacceptable", "fixed", ["это недопустимо", "very strong but polite criticism", "bu qabul qilib boʻlmaydi"], ["Waiting nine hours with no information is unacceptable."]),
      item("entitled-to", "be entitled to", "collocation", ["иметь право на", "to have the right to something", "…ga haqli boʻlmoq"], ["I believe I'm entitled to compensation."]),
      item("out-of-pocket", "be out of pocket", "idiom", ["понести расходы / остаться в минусе", "to have lost money", "zarar koʻrmoq"], ["I'm 300 dollars out of pocket because of the hotel."]),
      item("at-the-very-least", "at the very least", "fixed", ["как минимум", "the smallest acceptable thing", "hech boʻlmaganda"], ["At the very least, I expect a refund."]),
      item("look-into-matter", "look into the matter", "phrasal", ["разобраться в ситуации", "to investigate", "masalani koʻrib chiqmoq"], ["Could you look into the matter urgently?"]),
      item("escalate", "escalate the issue", "collocation", ["передать вопрос выше", "to send a problem to a higher level", "masalani yuqoriga koʻtarmoq"], ["If nothing happens, I'll have to escalate the issue."]),
      item("make-up-for", "make up for", "phrasal", ["компенсировать / загладить", "to do something good after something bad", "oʻrnini qoplamoq"], ["How will you make up for this?"], {
        anti: [
          anti(
            "How will you compensate me this?",
            "How will you compensate me for this? / How will you make up for this?",
            "compensate someone FOR something — без for нельзя.",
            "It's 'compensate someone FOR something' — 'for' is needed.",
            "compensate someone FOR something — for shart.",
          ),
        ],
      }),
      item("in-writing", "in writing", "fixed", ["в письменном виде", "on paper or by email", "yozma ravishda"], ["Could you confirm that in writing?"]),
    ],
    exercises: [
      { type: "collocate", prompt: "I'd like to ___ a complaint.", options: ["do", "make", "give"], answer: 1, item: "i-wish-to-complain" },
      { type: "choice", prompt: "I believe I'm ___ to compensation.", options: ["entitled", "titled", "allowed"], answer: 0, item: "entitled-to" },
      { type: "choice", prompt: "How will you compensate me ___ this?", options: ["—", "for", "about"], answer: 1, item: "make-up-for" },
      { type: "gap", prompt: "I'm 300 dollars out of ___ because of the hotel.", answer: "pocket", item: "out-of-pocket" },
      { type: "gap", prompt: "Could you confirm that in ___?", answer: "writing", item: "in-writing" },
      { type: "collocate", prompt: "If nothing happens, I'll have to ___ the issue.", options: ["escalate", "rise", "grow"], answer: 0, item: "escalate" },
      { type: "translate", from: l3("Это недопустимо.", "Say this is not OK at all.", "Bu qabul qilib boʻlmaydi."), answer: "This is unacceptable.", accept: ["That is unacceptable.", "This is unacceptable"], item: "unacceptable" },
      { type: "spot", sentence: "I want to do a complaint about my flight.", wrong: "do a complaint", right: "make a complaint", why: l3("make a complaint.", "make a complaint.", "make a complaint."), item: "i-wish-to-complain" },
    ],
    mission: {
      role: "an airline customer service manager who first offers only a small voucher",
      scene: l3("Стойка авиакомпании в Стамбуле", "An airline desk in Istanbul", "Istanbuldagi aviakompaniya stoykasi"),
      opener: "Good afternoon. I understand your flight was cancelled. How can I help?",
      goals: [
        goal("complain", ["Изложите жалобу", "State the complaint", "Shikoyatni bayon qiling"], ["complaint", "cancelled", "missed", "unacceptable"]),
        goal("rights", ["Сошлитесь на свои права", "Refer to your rights", "Huquqlaringizga tayaning"], ["entitled", "my rights", "regulations"]),
        goal("costs", ["Назовите расходы", "Mention your costs", "Xarajatlaringizni ayting"], ["out of pocket", "hotel", "dollars", "paid"]),
        goal("result", ["Добейтесь конкретного решения", "Get a concrete result", "Aniq natijaga erishing"], ["in writing", "at the very least", "refund", "compensation", "escalate"]),
      ],
      script: [
        "I'm very sorry. We can offer you a 50-dollar voucher for your next flight.",
        "I understand. Let me check what we can do.",
        "OK. We can refund your hotel and add 250 euros compensation.",
        "Of course. You'll get an email confirmation within the hour.",
      ],
    },
  },
];
