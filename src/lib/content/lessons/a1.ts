import type { LessonSeed } from "../types";
import { anti, goal, item, l3 } from "./helpers";

export const A1_LESSONS: LessonSeed[] = [
  // ───────────── 1. Meeting people ─────────────
  {
    slug: "a1-meet-people",
    level: "A1",
    icon: "Hand",
    title: l3("Знакомство", "Meeting people", "Tanishuv"),
    situation: l3(
      "Первый день на курсах в IT Park: нужно представиться новым людям.",
      "Your first day at a course in IT Park: introduce yourself to new people.",
      "IT Parkdagi kursda birinchi kun: yangi odamlar bilan tanishish kerak.",
    ),
    canDo: l3(
      "Представиться, сказать, откуда вы и чем занимаетесь, и спросить о том же собеседника.",
      "Introduce yourself, say where you are from and what you do, and ask the same back.",
      "Oʻzingizni tanishtirish, qayerdan ekaningiz va nima ish qilishingizni aytish hamda shuni soʻrash.",
    ),
    items: [
      item("nice-to-meet-you", "nice to meet you", "fixed", ["приятно познакомиться", "said when you meet someone for the first time", "tanishganimdan xursandman"], [
        "Hi, I'm Aziz. — Nice to meet you, Aziz!",
        "Nice to meet you too.",
      ]),
      item("im-from", "I'm from …", "fixed", ["я из …", "says which city or country you come from", "men …danman"], ["I'm from Samarkand.", "Where are you from?"], {
        anti: [
          anti(
            "I from Tashkent.",
            "I'm from Tashkent.",
            "В английском предложении нужен глагол: I am → I'm.",
            "An English sentence needs a verb: I am → I'm.",
            "Ingliz tilidagi gapda fe'l boʻlishi shart: I am → I'm.",
          ),
        ],
      }),
      item("what-do-you-do", "What do you do?", "fixed", ["кем вы работаете?", "a polite way to ask about someone's job", "nima ish qilasiz?"], [
        "What do you do? — I'm a designer.",
      ]),
      item("work-as", "work as a …", "collocation", ["работать кем-то", "to have a certain job", "… boʻlib ishlamoq"], ["I work as a teacher.", "She works as a nurse."], {
        anti: [
          anti(
            "I work like a teacher.",
            "I work as a teacher.",
            "like — «похоже на», а as — «в роли». Профессию называем через as.",
            "like means 'similar to'; as means 'in the role of'. Use as for jobs.",
            "like — «oʻxshab», as — «sifatida». Kasb uchun as ishlatiladi.",
          ),
        ],
      }),
      item("how-are-you", "How are you? — I'm fine, thanks.", "fixed", ["как дела? — хорошо, спасибо", "a short friendly greeting and answer", "qalaysiz? — yaxshi, rahmat"], [
        "Hi, Lola! How are you? — I'm fine, thanks. And you?",
      ]),
      item("this-is-my", "this is my …", "fixed", ["это мой / моя …", "used to introduce another person", "bu mening …im"], ["This is my friend, Bobur.", "This is my sister."]),
      item("a-little-english", "speak a little English", "collocation", ["немного говорить по-английски", "to speak English, but not very well yet", "biroz inglizcha gapirmoq"], [
        "I speak a little English.",
        "Do you speak Uzbek? — Just a little.",
      ]),
      item("see-you", "see you later", "fixed", ["увидимся", "an informal way to say goodbye", "koʻrishguncha"], ["Bye, see you later!"], { register: "informal" }),
    ],
    exercises: [
      { type: "dialogue", line: "Hi, I'm Sam. Nice to meet you!", options: ["Nice to meet you too!", "Yes, I am.", "See you later."], answer: 0, item: "nice-to-meet-you" },
      { type: "collocate", prompt: "I work ___ a nurse.", options: ["as", "like", "how"], answer: 0, item: "work-as" },
      { type: "gap", prompt: "I'm ___ Bukhara.", answer: "from", item: "im-from" },
      { type: "order", answer: "What do you do?", hint: l3("Кем вы работаете?", "Ask about someone's job", "Nima ish qilasiz?"), item: "what-do-you-do" },
      { type: "translate", from: l3("Это мой брат.", "Introduce your brother.", "Bu mening akam."), answer: "This is my brother.", accept: ["This is my brother", "this is my brother."], item: "this-is-my" },
      { type: "choice", prompt: "___ are you? — I'm fine, thanks.", options: ["What", "How", "Who"], answer: 1, item: "how-are-you" },
      { type: "dialogue", line: "Do you speak English?", options: ["Yes, a little.", "Yes, I'm from.", "Nice to meet you."], answer: 0, item: "a-little-english" },
    ],
    mission: {
      role: "Jasur, a friendly student at a course in IT Park, Tashkent, meeting the learner on the first day",
      scene: l3("Кофе-брейк на курсах в IT Park", "Coffee break at a course in IT Park", "IT Parkdagi kursda kofe-breyk"),
      opener: "Hi! I'm Jasur. What's your name?",
      goals: [
        goal("name", ["Назовите своё имя", "Say your name", "Ismingizni ayting"], ["i'm ", "my name", "i am "]),
        goal("from", ["Скажите, откуда вы", "Say where you are from", "Qayerdan ekaningizni ayting"], ["from"]),
        goal("job", ["Расскажите, чем занимаетесь", "Say what you do", "Nima ish qilishingizni ayting"], ["work as", "i'm a", "i am a", "student"]),
        goal("ask", ["Задайте вопрос Жасуру", "Ask Jasur a question", "Jasurga savol bering"], ["?"]),
      ],
      script: ["Nice to meet you! Where are you from?", "Oh, cool! And what do you do?", "Great! I work as a web developer. Any questions for me?", "It was nice to meet you. See you later!"],
    },
  },

  // ───────────── 2. Chaikhana ─────────────
  {
    slug: "a1-chaikhana",
    level: "A1",
    icon: "Soup",
    title: l3("Заказ в чайхане", "Ordering at a chaikhana", "Choyxonada buyurtma"),
    situation: l3(
      "Вы привели иностранного гостя в чайхану и заказываете еду за двоих.",
      "You bring a foreign guest to a chaikhana and order food for two.",
      "Chet ellik mehmonni choyxonaga olib keldingiz va ikki kishiga ovqat buyurtma qilyapsiz.",
    ),
    canDo: l3(
      "Попросить меню, заказать еду и напитки, попросить счёт.",
      "Ask for the menu, order food and drinks, and ask for the bill.",
      "Menyuni soʻrash, ovqat va ichimlik buyurtma qilish, hisobni soʻrash.",
    ),
    items: [
      item("table-for-two", "a table for two", "fixed", ["столик на двоих", "a table for two people", "ikki kishilik stol"], ["A table for two, please."]),
      item("can-i-have", "Can I have …?", "fixed", ["можно мне …?", "a polite way to order or ask for something", "… bersangiz?"], ["Can I have the menu, please?", "Can I have a green tea?"], {
        anti: [
          anti(
            "Give me plov.",
            "Can I have plov, please?",
            "«Give me» звучит как приказ. В кафе вежливо говорить «Can I have …, please?».",
            "'Give me' sounds like an order. In a café, 'Can I have …, please?' is polite.",
            "«Give me» buyruqdek eshitiladi. Kafeda «Can I have …, please?» deyish odobli.",
          ),
        ],
      }),
      item("id-like", "I'd like …", "fixed", ["я бы хотел(а) …", "a polite way to say what you want", "… istardim"], ["I'd like some plov, please.", "We'd like two samsas."]),
      item("pot-of-tea", "a pot of tea", "collocation", ["чайник чая", "tea served in a teapot", "bir choynak choy"], ["A pot of green tea, please."]),
      item("for-me", "… for me", "fixed", ["мне — …", "used when you say what you will eat or drink", "menga …"], ["Lagman for me, please.", "And for you?"]),
      item("no-onion", "without onion", "collocation", ["без лука", "with no onion in it", "piyozsiz"], ["A salad without onion, please."]),
      item("the-bill", "the bill, please", "fixed", ["счёт, пожалуйста", "you say this when you want to pay", "hisobni bering"], ["Excuse me, the bill, please."], {
        anti: [
          anti(
            "Can I have the check of money?",
            "Can I have the bill, please?",
            "Счёт в ресторане — the bill (в США — the check). «Check of money» не говорят.",
            "In a restaurant it's 'the bill' (US: 'the check'). Nobody says 'check of money'.",
            "Restoranda hisob — the bill (AQShda — the check). «Check of money» deyilmaydi.",
          ),
        ],
      }),
      item("delicious", "It's delicious!", "fixed", ["очень вкусно!", "it tastes very good", "juda mazali!"], ["This plov is delicious!"]),
      item("pay-by-card", "pay by card", "collocation", ["платить картой", "to pay with a bank card", "karta bilan toʻlamoq"], ["Can I pay by card?"]),
    ],
    exercises: [
      { type: "dialogue", line: "Hello! How many people?", options: ["A table for two, please.", "Two plov for me.", "I'm two."], answer: 0, item: "table-for-two" },
      { type: "choice", prompt: "___ the menu, please?", options: ["Give me", "Can I have", "I want have"], answer: 1, item: "can-i-have" },
      { type: "collocate", prompt: "a ___ of tea", options: ["pot", "cup of pot", "box"], answer: 0, item: "pot-of-tea" },
      { type: "gap", prompt: "I'd ___ some lagman, please.", answer: "like", item: "id-like" },
      { type: "collocate", prompt: "Can I pay ___ card?", options: ["with the", "by", "on"], answer: 1, item: "pay-by-card" },
      { type: "translate", from: l3("Салат без лука, пожалуйста.", "Order a salad with no onion.", "Piyozsiz salat, iltimos."), answer: "A salad without onion, please.", accept: ["Salad without onion, please", "A salad without onion please"], item: "no-onion" },
      { type: "order", answer: "Excuse me, the bill, please.", hint: l3("Извините, счёт, пожалуйста.", "Ask to pay", "Kechirasiz, hisobni bering."), item: "the-bill" },
    ],
    mission: {
      role: "a friendly waiter in a traditional chaikhana in Tashkent",
      scene: l3("Чайхана у Чорсу, обед", "A chaikhana near Chorsu, lunchtime", "Chorsu yonidagi choyxona, tushlik"),
      opener: "Assalomu alaykum! Welcome! How many people?",
      goals: [
        goal("table", ["Попросите столик", "Ask for a table", "Stol soʻrang"], ["table", "two", "for two"]),
        goal("food", ["Закажите блюдо", "Order a dish", "Taom buyurtma qiling"], ["i'd like", "can i have", "for me", "plov", "lagman", "samsa"]),
        goal("drink", ["Закажите напиток", "Order a drink", "Ichimlik buyurtma qiling"], ["tea", "water", "juice", "coffee"]),
        goal("bill", ["Попросите счёт", "Ask for the bill", "Hisobni soʻrang"], ["bill", "pay", "check"]),
      ],
      script: [
        "This way, please. Here is the menu. What would you like?",
        "Great choice! Anything to drink?",
        "Here you are. Enjoy your meal!",
        "Of course. That's 85,000 sums. Thank you, come again!",
      ],
    },
  },

  // ───────────── 3. Taxi ─────────────
  {
    slug: "a1-taxi",
    level: "A1",
    icon: "Car",
    title: l3("Такси Yandex Go", "Taking a Yandex Go taxi", "Yandex Go taksisi"),
    situation: l3(
      "Вы едете на такси в аэропорт и объясняете водителю, куда и как ехать.",
      "You take a taxi to the airport and tell the driver where and how to go.",
      "Taksida aeroportga ketyapsiz va haydovchiga qayerga va qanday borishni tushuntiryapsiz.",
    ),
    canDo: l3(
      "Назвать адрес, попросить остановиться и спросить, сколько ехать.",
      "Give an address, ask the driver to stop, and ask how long the ride is.",
      "Manzilni aytish, toʻxtashni soʻrash va qancha yurish kerakligini soʻrash.",
    ),
    items: [
      item("take-me-to", "Can you take me to …?", "fixed", ["отвезите меня в …", "asking a driver to drive you somewhere", "meni …ga olib boring"], ["Can you take me to the airport, please?"]),
      item("get-in", "get in / get out", "phrasal", ["садиться / выходить (из машины)", "to enter / leave a car", "mashinaga oʻtirmoq / tushmoq"], ["Please get in.", "I'll get out here."], {
        anti: [
          anti(
            "I want to go out from the taxi here.",
            "I'll get out here.",
            "Из машины «выходят» фразовым глаголом get out (of the car). Go out — это «пойти погулять».",
            "You 'get out' of a car. 'Go out' means going out for fun.",
            "Mashinadan get out bilan tushiladi. Go out — «sayr qilishga chiqmoq».",
          ),
        ],
      }),
      item("stop-here", "Can you stop here?", "fixed", ["остановите здесь", "asking the driver to stop", "shu yerda toʻxtating"], ["Can you stop here, please?"]),
      item("turn-left", "turn left / turn right", "collocation", ["повернуть налево / направо", "to change direction", "chapga / oʻngga burilmoq"], ["Turn left at the traffic lights."]),
      item("how-long", "How long does it take?", "fixed", ["сколько ехать?", "asking how much time a trip needs", "qancha vaqt ketadi?"], ["How long does it take to the airport?"]),
      item("in-a-hurry", "I'm in a hurry", "fixed", ["я тороплюсь", "you need to be fast", "shoshyapman"], ["Sorry, I'm in a hurry."], {
        anti: [
          anti(
            "I'm hurry.",
            "I'm in a hurry.",
            "hurry — существительное здесь, поэтому нужно «in a»: I'm in a hurry. Или глаголом: I'm hurrying.",
            "Here 'hurry' is a noun, so say 'in a hurry'. Or use the verb: I'm hurrying.",
            "Bu yerda hurry — ot, shuning uchun «in a» kerak: I'm in a hurry.",
          ),
        ],
      }),
      item("traffic-jam", "a traffic jam", "collocation", ["пробка", "a lot of cars that can't move", "tirbandlik"], ["Sorry, there's a traffic jam on Amir Temur street."]),
      item("keep-the-change", "keep the change", "fixed", ["сдачи не надо", "the driver can keep the extra money", "qaytimi kerak emas"], ["Here you are. Keep the change!"]),
    ],
    exercises: [
      { type: "dialogue", line: "Hello! Where to?", options: ["Can you take me to Tashkent City, please?", "I'm from Tashkent.", "Keep the change."], answer: 0, item: "take-me-to" },
      { type: "collocate", prompt: "I'll ___ out here, thank you.", options: ["go", "get", "make"], answer: 1, item: "get-in" },
      { type: "gap", prompt: "Turn ___ at the traffic lights.", answer: "left", accept: ["right"], item: "turn-left" },
      { type: "choice", prompt: "How long does it ___ to the airport?", options: ["take", "make", "go"], answer: 0, item: "how-long" },
      { type: "order", answer: "Can you stop here, please?", hint: l3("Остановите здесь, пожалуйста.", "Ask the driver to stop", "Shu yerda toʻxtating, iltimos."), item: "stop-here" },
      { type: "translate", from: l3("Извините, я тороплюсь.", "Say you need to be fast.", "Kechirasiz, shoshyapman."), answer: "Sorry, I'm in a hurry.", accept: ["Sorry, I am in a hurry.", "Sorry I'm in a hurry"], item: "in-a-hurry" },
      { type: "dialogue", line: "That's 32,000 sums.", options: ["Here you are. Keep the change!", "Take me to the change.", "I'm in a jam."], answer: 0, item: "keep-the-change" },
    ],
    mission: {
      role: "a taxi driver in Tashkent who speaks only English with the learner",
      scene: l3("Такси от Юнусабада до аэропорта", "A taxi from Yunusabad to the airport", "Yunusoboddan aeroportgacha taksi"),
      opener: "Good morning! Where would you like to go?",
      goals: [
        goal("where", ["Назовите, куда ехать", "Say where to go", "Qayerga borishni ayting"], ["take me", "airport", "to the"]),
        goal("time", ["Спросите, сколько ехать", "Ask how long it takes", "Qancha vaqt ketishini soʻrang"], ["how long", "minutes", "time"]),
        goal("hurry", ["Скажите, что торопитесь", "Say you're in a hurry", "Shoshayotganingizni ayting"], ["hurry", "fast", "quick"]),
        goal("stop", ["Попросите остановиться", "Ask the driver to stop", "Toʻxtashni soʻrang"], ["stop", "get out", "here"]),
      ],
      script: [
        "OK, no problem! Please get in.",
        "About thirty minutes. There's a traffic jam near the bridge.",
        "Don't worry, I know a fast way.",
        "Here we are! That's 45,000 sums. Have a good flight!",
      ],
    },
  },

  // ───────────── 4. Bazaar ─────────────
  {
    slug: "a1-bazaar",
    level: "A1",
    icon: "ShoppingBag",
    title: l3("Покупки на Чорсу", "Shopping at Chorsu bazaar", "Chorsu bozorida xarid"),
    situation: l3(
      "Вы покупаете фрукты и специи на базаре Чорсу вместе с туристом.",
      "You buy fruit and spices at Chorsu bazaar with a tourist.",
      "Turist bilan Chorsu bozorida meva va ziravor xarid qilyapsiz.",
    ),
    canDo: l3(
      "Спросить цену, количество, поторговаться и заплатить.",
      "Ask the price and amount, bargain a little, and pay.",
      "Narx va miqdorni soʻrash, savdolashish va toʻlash.",
    ),
    items: [
      item("how-much", "How much is it?", "fixed", ["сколько стоит?", "asking the price", "bu qancha turadi?"], ["How much is this melon?", "How much are the apples?"], {
        anti: [
          anti(
            "How many does it cost?",
            "How much does it cost?",
            "О цене спрашивают How much. How many — про количество предметов.",
            "Use 'how much' for price. 'How many' is for counting things.",
            "Narx haqida How much bilan soʻraladi. How many — sanaladigan narsalar soni uchun.",
          ),
        ],
      }),
      item("a-kilo-of", "a kilo of …", "collocation", ["килограмм …", "one kilogram of something", "bir kilo …"], ["A kilo of tomatoes, please.", "Two kilos of apples."]),
      item("too-expensive", "It's too expensive", "fixed", ["слишком дорого", "the price is higher than you want", "juda qimmat"], ["Sorry, it's too expensive for me."]),
      item("discount", "Can you give me a discount?", "fixed", ["можно скидку?", "asking for a lower price", "chegirma qilasizmi?"], ["Can you give me a discount if I buy two?"]),
      item("try-it", "Can I try it?", "fixed", ["можно попробовать?", "asking to taste something", "tatib koʻrsam boʻladimi?"], ["These grapes look good. Can I try one?"]),
      item("fresh", "fresh bread / fresh fruit", "collocation", ["свежий хлеб / свежие фрукты", "made or picked recently", "yangi non / yangi meva"], ["Is this bread fresh?"]),
      item("thats-all", "That's all, thanks", "fixed", ["это всё, спасибо", "you don't need anything else", "boʻldi, rahmat"], ["Anything else? — No, that's all, thanks."]),
      item("ill-take-it", "I'll take it", "fixed", ["беру", "you decide to buy", "olaman"], ["OK, 20,000 — I'll take it!"], {
        anti: [
          anti(
            "I will buy it from you now.",
            "I'll take it.",
            "Не ошибка, но в магазине естественнее короткое «I'll take it».",
            "Not wrong, but in a shop the short 'I'll take it' is what people say.",
            "Xato emas, lekin doʻkonda qisqa «I'll take it» tabiiyroq.",
          ),
        ],
      }),
    ],
    exercises: [
      { type: "choice", prompt: "How ___ is this melon?", options: ["many", "much", "cost"], answer: 1, item: "how-much" },
      { type: "collocate", prompt: "a ___ of tomatoes", options: ["kilo", "piece", "bottle"], answer: 0, item: "a-kilo-of" },
      { type: "dialogue", line: "It's 50,000 sums.", options: ["It's too expensive. Can you give me a discount?", "That's all, fresh.", "I'm from bazaar."], answer: 0, item: "discount" },
      { type: "gap", prompt: "These grapes look good. Can I ___ one?", answer: "try", item: "try-it" },
      { type: "translate", from: l3("Это всё, спасибо.", "Say you don't need anything else.", "Boʻldi, rahmat."), answer: "That's all, thanks.", accept: ["That's all, thank you.", "That is all, thanks."], item: "thats-all" },
      { type: "order", answer: "OK, I'll take it.", hint: l3("Хорошо, беру.", "Decide to buy", "Mayli, olaman."), item: "ill-take-it" },
      { type: "collocate", prompt: "Is this bread ___?", options: ["new", "fresh", "young"], answer: 1, why: l3("Про хлеб и фрукты говорят fresh, не new.", "Bread and fruit are 'fresh', not 'new'.", "Non va meva haqida fresh deyiladi, new emas."), item: "fresh" },
    ],
    mission: {
      role: "a cheerful fruit seller at Chorsu bazaar who likes to bargain",
      scene: l3("Фруктовые ряды Чорсу", "The fruit rows at Chorsu", "Chorsudagi meva rastalari"),
      opener: "Hello, my friend! Fresh melons, sweet grapes! What would you like?",
      goals: [
        goal("price", ["Спросите цену", "Ask the price", "Narxni soʻrang"], ["how much", "price", "cost"]),
        goal("amount", ["Назовите количество", "Say how much you want", "Miqdorni ayting"], ["kilo", "two", "one", "three"]),
        goal("bargain", ["Поторгуйтесь", "Bargain", "Savdolashing"], ["discount", "expensive", "cheaper", "less"]),
        goal("buy", ["Купите", "Buy it", "Sotib oling"], ["i'll take", "take it", "ok", "deal"]),
      ],
      script: [
        "Melons are 25,000 sums each. Grapes — 30,000 a kilo.",
        "Hmm… for you, my friend, 22,000! Try it — very sweet!",
        "OK, OK! 20,000. Last price!",
        "Thank you! Come again!",
      ],
    },
  },

  // ───────────── 5. Metro ─────────────
  {
    slug: "a1-metro",
    level: "A1",
    icon: "MapPin",
    title: l3("Дорога в метро", "Asking the way in the metro", "Metroda yoʻl soʻrash"),
    situation: l3(
      "Турист заблудился в ташкентском метро — помогите ему, а потом спросите дорогу сами.",
      "A tourist is lost in the Tashkent metro — help them, then ask the way yourself.",
      "Turist Toshkent metrosida adashib qoldi — unga yordam bering, keyin oʻzingiz yoʻl soʻrang.",
    ),
    canDo: l3(
      "Спросить и объяснить дорогу: станция, пересадка, сколько остановок.",
      "Ask for and give directions: station, change lines, how many stops.",
      "Yoʻl soʻrash va tushuntirish: bekat, liniya almashtirish, nechta bekat.",
    ),
    items: [
      item("excuse-me", "Excuse me, …", "fixed", ["извините, …", "a polite way to start talking to a stranger", "kechirasiz, …"], ["Excuse me, where is the metro?"], {
        anti: [
          anti(
            "Sorry, where is the metro?",
            "Excuse me, where is the metro?",
            "Чтобы обратиться к незнакомцу, говорят Excuse me. Sorry — когда извиняются за что-то.",
            "Use 'excuse me' to get a stranger's attention. 'Sorry' is for apologising.",
            "Notanish odamga murojaat uchun Excuse me. Sorry — uzr soʻraganda.",
          ),
        ],
      }),
      item("how-do-i-get", "How do I get to …?", "fixed", ["как добраться до …?", "asking the way to a place", "…ga qanday borsam boʻladi?"], ["How do I get to Amir Temur Square?"]),
      item("change-at", "change at …", "collocation", ["пересесть на …", "to move to another metro line at a station", "…da almashtirmoq"], ["Change at Paxtakor for the blue line."]),
      item("get-off", "get off at …", "phrasal", ["выйти на (станции) …", "to leave a train or bus", "…da tushmoq"], ["Get off at Kosmonavtlar."], {
        anti: [
          anti(
            "Go out at Chorsu station.",
            "Get off at Chorsu.",
            "Из поезда, автобуса, метро — get off. Get out — из машины или такси.",
            "Trains, buses and the metro: 'get off'. A car or taxi: 'get out'.",
            "Poyezd, avtobus, metrodan — get off. Mashina yoki taksidan — get out.",
          ),
        ],
      }),
      item("stops", "It's two stops", "fixed", ["это две остановки", "the number of stations to travel", "ikki bekat"], ["It's three stops from here."]),
      item("next-station", "the next station", "collocation", ["следующая станция", "the station after this one", "keyingi bekat"], ["The next station is Mustaqillik Maydoni."]),
      item("on-the-left", "on your left / on your right", "fixed", ["слева / справа от вас", "where something is", "chap / oʻng tomoningizda"], ["The exit is on your left."]),
      item("buy-a-ticket", "buy a ticket / top up a card", "collocation", ["купить билет / пополнить карту", "to pay for travel", "chipta olmoq / kartani toʻldirmoq"], ["Where can I top up my card?"]),
    ],
    exercises: [
      { type: "choice", prompt: "___, how do I get to Chorsu?", options: ["Excuse me", "Sorry for", "Hey you"], answer: 0, item: "excuse-me" },
      { type: "gap", prompt: "How do I ___ to the Registan?", answer: "get", item: "how-do-i-get" },
      { type: "collocate", prompt: "___ off at Kosmonavtlar.", options: ["Go", "Get", "Take"], answer: 1, item: "get-off" },
      { type: "collocate", prompt: "___ at Paxtakor for the blue line.", options: ["Change", "Turn", "Move"], answer: 0, item: "change-at" },
      { type: "dialogue", line: "Is it far?", options: ["No, it's two stops.", "Yes, on your change.", "Get off the ticket."], answer: 0, item: "stops" },
      { type: "translate", from: l3("Выход слева.", "Say where the exit is.", "Chiqish chap tomonda."), answer: "The exit is on your left.", accept: ["The exit is on the left.", "The exit is on your left"], item: "on-the-left" },
      { type: "order", answer: "Where can I top up my card?", hint: l3("Где пополнить карту?", "Ask where to add money to your card", "Kartani qayerda toʻldirsam boʻladi?"), item: "buy-a-ticket" },
    ],
    mission: {
      role: "a lost tourist from Germany in the Tashkent metro who needs to get to Chorsu bazaar",
      scene: l3("Станция «Мустакиллик майдони»", "Mustaqillik Maydoni station", "Mustaqillik maydoni bekati"),
      opener: "Excuse me! Do you speak English? I need to get to Chorsu bazaar.",
      goals: [
        goal("line", ["Объясните, на какой поезд сесть", "Explain which train to take", "Qaysi poyezdga chiqishni tushuntiring"], ["take", "line", "train"]),
        goal("change", ["Скажите про пересадку", "Explain where to change", "Qayerda almashtirishni ayting"], ["change"]),
        goal("stop", ["Скажите, где выходить", "Say where to get off", "Qayerda tushishni ayting"], ["get off", "stops", "stop"]),
        goal("polite", ["Попрощайтесь вежливо", "Say a polite goodbye", "Odob bilan xayrlashing"], ["welcome", "good luck", "bye", "have a nice"]),
      ],
      script: [
        "Thank you! Which train do I take?",
        "Do I need to change trains?",
        "And where do I get off?",
        "Perfect, thank you so much!",
      ],
    },
  },

  // ───────────── 6. Family ─────────────
  {
    slug: "a1-family",
    level: "A1",
    icon: "Users",
    title: l3("Рассказ о семье", "Talking about your family", "Oila haqida hikoya"),
    situation: l3(
      "Новый друг из другой страны смотрит фото с вашей свадьбы и спрашивает, кто есть кто.",
      "A new friend from abroad looks at your family wedding photos and asks who is who.",
      "Chet ellik yangi doʻstingiz toʻy suratlaringizni koʻrib, kim kimligini soʻrayapti.",
    ),
    canDo: l3(
      "Рассказать о членах семьи: кто они, сколько им лет, чем занимаются.",
      "Talk about family members: who they are, their age, what they do.",
      "Oila a'zolari haqida gapirish: kimligi, yoshi, nima ish qilishi.",
    ),
    items: [
      item("have-got", "I have two brothers", "fixed", ["у меня два брата", "saying how many relatives you have", "mening ikkita akam bor"], ["I have one sister and two brothers."], {
        anti: [
          anti(
            "I have two brother.",
            "I have two brothers.",
            "После числа больше одного нужно -s: two brothers.",
            "After a number above one, add -s: two brothers.",
            "Birdan katta sondan keyin -s qoʻshiladi: two brothers.",
          ),
        ],
      }),
      item("older-younger", "older / younger brother", "collocation", ["старший / младший брат", "a brother born before / after you", "aka / uka"], ["My older sister is a doctor.", "My younger brother is at school."]),
      item("years-old", "… years old", "fixed", ["… лет", "used to say someone's age", "… yoshda"], ["My grandmother is seventy years old."], {
        anti: [
          anti(
            "She has 30 years.",
            "She is 30 (years old).",
            "Возраст в английском — через be: She is 30.",
            "In English, age uses 'be': She is 30.",
            "Ingliz tilida yosh be bilan aytiladi: She is 30.",
          ),
        ],
      }),
      item("get-married", "get married", "collocation", ["пожениться / выйти замуж", "to become husband and wife", "turmush qurmoq"], ["My cousin got married last summer."]),
      item("grow-up", "grow up", "phrasal", ["вырасти", "to become an adult", "ulgʻaymoq"], ["I grew up in Namangan."]),
      item("look-like", "look like", "phrasal", ["быть похожим на", "to have a similar face", "…ga oʻxshamoq"], ["You look like your mother!"]),
      item("big-family", "a big family", "collocation", ["большая семья", "a family with many people", "katta oila"], ["I come from a big family."]),
      item("only-child", "an only child", "fixed", ["единственный ребёнок", "a child with no brothers or sisters", "yolgʻiz farzand"], ["Are you an only child?"]),
    ],
    exercises: [
      { type: "choice", prompt: "I have two ___.", options: ["sister", "sisters", "sisteres"], answer: 1, item: "have-got" },
      { type: "choice", prompt: "My grandfather ___ eighty years old.", options: ["has", "is", "have"], answer: 1, item: "years-old" },
      { type: "collocate", prompt: "My cousin got ___ last summer.", options: ["married", "marry", "wedding"], answer: 0, item: "get-married" },
      { type: "gap", prompt: "You look ___ your father!", answer: "like", item: "look-like" },
      { type: "translate", from: l3("Я вырос в Намангане.", "Say where you spent your childhood (Namangan).", "Men Namanganda ulgʻayganman."), answer: "I grew up in Namangan.", accept: ["I grew up in Namangan"], item: "grow-up" },
      { type: "dialogue", line: "Do you have any brothers or sisters?", options: ["No, I'm an only child.", "No, I'm a big family.", "Yes, I'm older."], answer: 0, item: "only-child" },
      { type: "order", answer: "My younger brother is at school.", hint: l3("Мой младший брат учится в школе.", "Talk about your younger brother", "Ukam maktabda oʻqiydi."), item: "older-younger" },
    ],
    mission: {
      role: "Emma, a friend from Canada, looking at the learner's family photos and asking curious questions",
      scene: l3("Вечер, фотоальбом с семейной свадьбы", "Evening, a family wedding photo album", "Kechqurun, oilaviy toʻy albomi"),
      opener: "Wow, what a beautiful wedding! Who is this man next to you?",
      goals: [
        goal("who", ["Скажите, кто на фото", "Say who is in the photo", "Suratda kimligini ayting"], ["my ", "brother", "father", "sister", "mother", "uncle", "cousin"]),
        goal("age", ["Назовите чей-то возраст", "Say someone's age", "Kimningdir yoshini ayting"], ["years old", " is 2", " is 3", " is 4", " is 5", " is 6", " is 7"]),
        goal("job", ["Скажите, кем работает родственник", "Say what a relative does", "Qarindoshingiz kasbini ayting"], ["works as", "is a ", "doctor", "teacher", "engineer"]),
        goal("family", ["Скажите, большая ли у вас семья", "Say if your family is big", "Oilangiz kattami, ayting"], ["big family", "small family", "only child", "brothers", "sisters"]),
      ],
      script: [
        "Oh, nice! How old is he?",
        "And what does he do?",
        "You look like him! Is your family big?",
        "That's lovely. Thank you for showing me!",
      ],
    },
  },
];
