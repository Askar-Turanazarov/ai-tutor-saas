import type { Level } from "../levels";

type L3 = { ru: string; en: string; uz: string };

export type BankItem =
  | { type: "choice"; prompt: string; options: string[]; answer: number; explanation?: L3 }
  | { type: "order"; prompt: L3; answer: string }
  | { type: "translate"; prompt: L3; answer: string; accept?: string[] };

const order = (answer: string, ru: string, uz: string): BankItem => ({
  type: "order",
  answer,
  prompt: { ru, en: "Put the words in order", uz },
});
const tr = (answer: string, ru: string, uz: string, accept?: string[]): BankItem => ({
  type: "translate",
  answer,
  accept,
  prompt: { ru, en: answer, uz },
});
const ch = (prompt: string, options: string[], answer: number, explanation?: L3): BankItem => ({
  type: "choice",
  prompt,
  options,
  answer,
  explanation,
});

/** Offline quiz bank used when no AI model is reachable. */
export const QUIZ_BANK: Record<Level, BankItem[]> = {
  A1: [
    ch("She ___ a teacher.", ["am", "is", "are"], 1, {
      ru: "He/she/it → is.",
      en: "He/she/it → is.",
      uz: "He/she/it → is.",
    }),
    ch("I ___ from Tashkent.", ["is", "are", "am"], 2, { ru: "I → am.", en: "I → am.", uz: "I → am." }),
    ch("___ apple a day.", ["A", "An", "The"], 1, {
      ru: "Перед гласным звуком — an.",
      en: "Use 'an' before a vowel sound.",
      uz: "Unli tovushdan oldin — an.",
    }),
    ch("They ___ plov on Thursdays.", ["cooks", "cook", "cooking"], 1),
    ch("My brother ___ football.", ["play", "plays", "playing"], 1, {
      ru: "В Present Simple с he/she/it добавляем -s.",
      en: "Present Simple: add -s with he/she/it.",
      uz: "Present Simple: he/she/it bilan -s qoʻshiladi.",
    }),
    ch("What ___ your name?", ["is", "are", "do"], 0),
    ch("I have two ___.", ["sister", "sisters", "sisteres"], 1),
    ch("___ you like tea?", ["Does", "Are", "Do"], 2),
    order("I live in Tashkent", "Я живу в Ташкенте", "Men Toshkentda yashayman"),
    order("My name is Aziz", "Меня зовут Азиз", "Mening ismim Aziz"),
    order("She has a big family", "У неё большая семья", "Uning katta oilasi bor"),
    tr("I like green tea", "Я люблю зелёный чай", "Men koʻk choyni yaxshi koʻraman", ["I love green tea"]),
    tr("Where are you from?", "Откуда ты?", "Siz qayerdansiz?", ["Where are you from"]),
    tr("It is hot today", "Сегодня жарко", "Bugun issiq", ["It's hot today", "Today it is hot", "Today is hot"]),
  ],
  A2: [
    ch("Yesterday I ___ to Chorsu bazaar.", ["go", "went", "gone"], 1, {
      ru: "Past Simple от go — went.",
      en: "Past Simple of go is went.",
      uz: "go feʼlining Past Simple shakli — went.",
    }),
    ch("I didn't ___ him at the party.", ["saw", "see", "seen"], 1, {
      ru: "После didn't — начальная форма глагола.",
      en: "After didn't use the base form.",
      uz: "didn't dan keyin feʼlning asosiy shakli.",
    }),
    ch("Samarkand is ___ than Tashkent.", ["older", "more old", "oldest"], 0),
    ch("There ___ many people at the bazaar.", ["is", "was", "were"], 2),
    ch("I am interested ___ history.", ["on", "in", "at"], 1, {
      ru: "interested in — устойчивое сочетание.",
      en: "The collocation is 'interested in'.",
      uz: "Barqaror birikma: interested in.",
    }),
    ch("We ___ dinner when he called.", ["had", "were having", "have"], 1),
    ch("How ___ is this melon?", ["many", "much", "long"], 1),
    ch("She is the ___ student in the class.", ["better", "best", "good"], 1),
    order("What did you do last weekend", "Что ты делал в прошлые выходные", "Oʻtgan dam olish kunlari nima qildingiz"),
    order("I usually go to work by metro", "Обычно я езжу на работу на метро", "Odatda ishga metroda boraman"),
    order("It was colder yesterday", "Вчера было холоднее", "Kecha sovuqroq edi"),
    tr("I have never been to Bukhara", "Я никогда не был в Бухаре", "Men hech qachon Buxoroda boʻlmaganman", [
      "I've never been to Bukhara",
    ]),
    tr("How much does it cost?", "Сколько это стоит?", "Bu qancha turadi?", ["How much is it?", "How much is it"]),
    tr("We went to the park", "Мы ходили в парк", "Biz bogʻga bordik", ["We went to the park."]),
  ],
  B1: [
    ch("If it rains tomorrow, we ___ at home.", ["stay", "will stay", "would stay"], 1, {
      ru: "First conditional: if + Present, will + глагол.",
      en: "First conditional: if + present, will + verb.",
      uz: "First conditional: if + Present, will + feʼl.",
    }),
    ch("I have lived here ___ 2015.", ["for", "since", "from"], 1),
    ch("She asked me where I ___.", ["live", "lived", "am living"], 1),
    ch("This bridge ___ in 1970.", ["built", "was built", "has built"], 1),
    ch("I'm looking forward to ___ you.", ["see", "seeing", "saw"], 1),
    ch("You ___ wear a seat belt. It's the law.", ["must", "might", "could"], 0),
    order("I have been learning English for two years", "Я учу английский уже два года", "Men ikki yildan beri ingliz tilini oʻrganyapman"),
    order("If I had more time I would travel", "Если бы у меня было больше времени, я бы путешествовал", "Koʻproq vaqtim boʻlganida sayohat qilardim"),
    tr("I used to live in Samarkand", "Раньше я жил в Самарканде", "Ilgari Samarqandda yashardim"),
    tr("She has already finished her work", "Она уже закончила работу", "U allaqachon ishini tugatdi", ["She has already finished work"]),
  ],
  B2: [
    ch("If I ___ you, I would accept the offer.", ["am", "was", "were"], 2),
    ch("By next year, I ___ my degree.", ["will finish", "will have finished", "finish"], 1),
    ch("He denied ___ the money.", ["to take", "taking", "take"], 1),
    ch("Hardly ___ arrived when it started to rain.", ["we had", "had we", "we have"], 1),
    ch("The report needs ___ by Friday.", ["finishing", "to finish", "finish"], 0),
    ch("I wish I ___ harder at school.", ["studied", "had studied", "would study"], 1),
    order("The city has changed a lot over the past decade", "Город сильно изменился за последнее десятилетие", "Shahar soʻnggi oʻn yilda ancha oʻzgardi"),
    tr("It is said that the city is over two thousand years old", "Говорят, что городу более двух тысяч лет", "Aytishlaricha, shahar ikki ming yildan ortiq yoshda", [
      "The city is said to be over two thousand years old",
    ]),
  ],
  C1: [
    ch("Not only ___ late, but he also forgot the documents.", ["he was", "was he", "he is"], 1),
    ch("The proposal was turned ___ by the board.", ["off", "down", "out"], 1),
    ch("She is ___ to be the best candidate.", ["considering", "considered", "consider"], 1),
    ch("Had I known, I ___ differently.", ["would act", "would have acted", "acted"], 1),
    ch("The findings ___ doubt on the original theory.", ["cast", "threw", "put"], 0),
    order("Were it not for your help we would have failed", "Если бы не твоя помощь, мы бы провалились", "Sening yordaming boʻlmaganda, muvaffaqiyatsizlikka uchragan boʻlardik"),
  ],
  C2: [
    ch("He's been ___ the bullet and finally quit his job.", ["biting", "chewing", "eating"], 0),
    ch("Her argument doesn't hold ___.", ["water", "air", "ground"], 0),
    ch("The minister's remarks were ___ at best.", ["disingenuous", "disinterested", "dissonant"], 0),
    ch("We need to nip this problem in the ___.", ["bud", "root", "seed"], 0),
    ch("His explanation was so ___ that nobody followed it.", ["convoluted", "concise", "candid"], 0),
    order("Little did they know what lay ahead", "Они и не подозревали, что их ждёт", "Ularni nima kutayotganini bilishmasdi"),
  ],
};
