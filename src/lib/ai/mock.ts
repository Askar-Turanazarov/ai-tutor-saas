/**
 * Offline tutor: answers when no AI model is reachable, so the student never sees an error.
 * Rule-based corrections cover the mistakes Russian and Uzbek speakers make most often.
 */
import type { ChatOut, Correction, MissionOut, PronunciationOut, QuizData, Question, Tip } from "./schemas";
import type { Mission } from "../content/types";
import type { ChatTurn } from "./types";
import { QUIZ_BANK } from "../content/quiz-bank";
import { IPA } from "../content/phrases";
import { topicBySlug } from "../content/topics";
import type { Level } from "../levels";

export type Lang = "ru" | "en" | "uz";
type L3 = Record<Lang, string>;

type Rule = {
  re: RegExp;
  fix: (m: RegExpMatchArray) => string;
  category: string;
  expl: L3;
  rule?: L3;
  examples?: string[];
};

const THIRD: Record<string, string> = { go: "goes", do: "does", have: "has", study: "studies", watch: "watches", fly: "flies", wash: "washes" };
const PAST_TO_BASE: Record<string, string> = { went: "go", ate: "eat", saw: "see", came: "come", did: "do", had: "have", made: "make", took: "take", got: "get", bought: "buy", wrote: "write", spoke: "speak" };

const keepCase = (src: string, out: string) => (src[0] === src[0].toUpperCase() ? out[0].toUpperCase() + out.slice(1) : out);

const RULES: Rule[] = [
  {
    re: /(^|[\s,.!?])i(?=[\s',.!?]|$)/,
    fix: (m) => `${m[1]}I`,
    category: "spelling",
    expl: { ru: "Местоимение «I» всегда пишется с заглавной буквы.", en: "The pronoun 'I' is always capitalised.", uz: "«I» olmoshi doimo bosh harf bilan yoziladi." },
    rule: { ru: "I — единственное местоимение, которое всегда пишется с большой буквы.", en: "'I' is the only pronoun that is always written with a capital letter.", uz: "«I» — doimo bosh harf bilan yoziladigan yagona olmosh." },
    examples: ["I am happy.", "Yesterday I went home."],
  },
  {
    re: /\b(he|she|it)\s+(go|do|have|like|want|work|live|play|watch|study|eat|drink|read|speak|love|cook|know|need)\b/i,
    fix: (m) => `${m[1]} ${THIRD[m[2].toLowerCase()] ?? m[2] + "s"}`,
    category: "grammar",
    expl: { ru: "С he/she/it в Present Simple к глаголу добавляется -s/-es.", en: "With he/she/it in the Present Simple the verb takes -s/-es.", uz: "Present Simple’da he/she/it bilan feʼlga -s/-es qoʻshiladi." },
    rule: { ru: "Present Simple, 3-е лицо ед. числа: he works, she goes, it has.", en: "Present Simple, third person singular: he works, she goes, it has.", uz: "Present Simple, 3-shaxs birlik: he works, she goes, it has." },
    examples: ["She lives in Tashkent.", "He has two brothers."],
  },
  {
    re: /\b(I)\s+(is|are)\b/,
    fix: (m) => `${m[1]} am`,
    category: "grammar",
    expl: { ru: "С I используется am.", en: "Use 'am' with I.", uz: "I bilan am ishlatiladi." },
    rule: { ru: "to be: I am, he/she/it is, you/we/they are.", en: "to be: I am, he/she/it is, you/we/they are.", uz: "to be: I am, he/she/it is, you/we/they are." },
    examples: ["I am a student."],
  },
  {
    re: /\b(I|you|we|they)\s+(has|goes|does|likes|wants|works|lives|plays|loves|needs|knows)\b/i,
    fix: (m) => `${m[1]} ${m[2].toLowerCase() === "has" ? "have" : m[2].replace(/(?<=[sx]h|o|ss)es$|s$/i, "")}`,
    category: "grammar",
    expl: { ru: "Окончание -s (has) нужно только с he/she/it.", en: "The -s ending (has) is only for he/she/it.", uz: "-s qoʻshimchasi (has) faqat he/she/it bilan." },
    rule: { ru: "Present Simple: I/you/we/they have, work; he/she/it has, works.", en: "Present Simple: I/you/we/they have, work; he/she/it has, works.", uz: "Present Simple: I/you/we/they have, work; he/she/it has, works." },
    examples: ["I have a cat.", "We live in Tashkent."],
  },
  {
    re: /\b(you|we|they)\s+is\b/i,
    fix: (m) => `${m[1]} are`,
    category: "grammar",
    expl: { ru: "С you/we/they используется are.", en: "Use 'are' with you/we/they.", uz: "you/we/they bilan are ishlatiladi." },
    rule: { ru: "to be: I am, he/she/it is, you/we/they are.", en: "to be: I am, he/she/it is, you/we/they are.", uz: "to be: I am, he/she/it is, you/we/they are." },
  },
  {
    re: /\b(he|she|it)\s+are\b/i,
    fix: (m) => `${m[1]} is`,
    category: "grammar",
    expl: { ru: "С he/she/it используется is.", en: "Use 'is' with he/she/it.", uz: "he/she/it bilan is ishlatiladi." },
  },
  {
    re: /\b([Aa])\s+((?!uni|use|usu|eu|one)[aeiou]\w*)/,
    fix: (m) => `${m[1]}n ${m[2]}`,
    category: "grammar",
    expl: { ru: "Перед гласным звуком используется an.", en: "Use 'an' before a vowel sound.", uz: "Unli tovushdan oldin an ishlatiladi." },
    rule: { ru: "a + согласный звук (a cat), an + гласный звук (an apple, an hour).", en: "a + consonant sound (a cat), an + vowel sound (an apple, an hour).", uz: "a + undosh tovush (a cat), an + unli tovush (an apple, an hour)." },
    examples: ["an apple", "an orange", "a university"],
  },
  {
    re: /\b(am|is|are)\s+agree\b/i,
    fix: () => "agree",
    category: "grammar",
    expl: { ru: "agree — это глагол, to be не нужен: I agree.", en: "'Agree' is a verb, so no 'to be': I agree.", uz: "agree — feʼl, to be kerak emas: I agree." },
    examples: ["I agree with you.", "I don't agree."],
  },
  {
    re: /\bmore\s+(better|worse|bigger|smaller|easier|harder|older|younger|cheaper)\b/i,
    fix: (m) => m[1],
    category: "grammar",
    expl: { ru: "Сравнительная степень уже образована, more не нужен.", en: "The word is already comparative; drop 'more'.", uz: "Soʻz allaqachon qiyosiy darajada, more kerak emas." },
  },
  {
    re: /\b(didn't|did not|doesn't|don't)\s+(went|ate|saw|came|did|had|made|took|got|bought|wrote|spoke)\b/i,
    fix: (m) => `${m[1]} ${PAST_TO_BASE[m[2].toLowerCase()]}`,
    category: "grammar",
    expl: { ru: "После didn't/don't используется начальная форма глагола.", en: "After didn't/don't use the base form of the verb.", uz: "didn't/don't dan keyin feʼlning asosiy shakli ishlatiladi." },
    rule: { ru: "Отрицание в Past Simple: didn't + V1 (I didn't go).", en: "Past Simple negative: didn't + base verb (I didn't go).", uz: "Past Simple inkor: didn't + V1 (I didn't go)." },
    examples: ["I didn't see him.", "We didn't go out."],
  },
  {
    re: /\bpeople\s+is\b/i,
    fix: () => "people are",
    category: "grammar",
    expl: { ru: "people — множественное число: people are.", en: "'People' is plural: people are.", uz: "people — koʻplik: people are." },
  },
  {
    re: /\bI\s+have\s+(\d+)\s+years(\s+old)?\b/i,
    fix: (m) => `I am ${m[1]} years old`,
    category: "vocabulary",
    expl: { ru: "Возраст в английском выражается через to be: I am 20 years old.", en: "Age uses 'to be' in English: I am 20 years old.", uz: "Ingliz tilida yosh to be orqali aytiladi: I am 20 years old." },
  },
  {
    re: /\bexplain\s+me\b/i,
    fix: () => "explain to me",
    category: "grammar",
    expl: { ru: "После explain нужен предлог to: explain to me.", en: "'Explain' needs 'to': explain to me.", uz: "explain dan keyin to kerak: explain to me." },
  },
  {
    re: /\b(depends|depend)\s+(of|from)\b/i,
    fix: (m) => `${m[1]} on`,
    category: "vocabulary",
    expl: { ru: "Правильно: depend on.", en: "The correct preposition is 'depend on'.", uz: "Toʻgʻrisi: depend on." },
  },
  {
    re: /\binterested\s+(on|about|for)\b/i,
    fix: () => "interested in",
    category: "vocabulary",
    expl: { ru: "Правильно: interested in.", en: "The collocation is 'interested in'.", uz: "Toʻgʻrisi: interested in." },
  },
  {
    re: /\blisten\s+(music|the music|radio|podcasts?)\b/i,
    fix: (m) => `listen to ${m[1]}`,
    category: "grammar",
    expl: { ru: "listen требует предлога to: listen to music.", en: "'Listen' takes 'to': listen to music.", uz: "listen dan keyin to kerak: listen to music." },
  },
  {
    re: /\bgo\s+to\s+home\b/i,
    fix: () => "go home",
    category: "grammar",
    expl: { ru: "С home предлог to не нужен: go home.", en: "No 'to' before 'home': go home.", uz: "home oldidan to kerak emas: go home." },
  },
  {
    re: /\bI\s+very\s+(like|love|want)\b/i,
    fix: (m) => `I really ${m[1]}`,
    category: "vocabulary",
    expl: { ru: "Нельзя сказать «I very like». Скажите I really like или I like … very much.", en: "We don't say 'I very like'. Say 'I really like' or 'I like … very much'.", uz: "«I very like» deyilmaydi. I really like yoki I like … very much deng." },
  },
  {
    re: /\bmarried\s+with\b/i,
    fix: () => "married to",
    category: "vocabulary",
    expl: { ru: "Правильно: married to.", en: "The correct phrase is 'married to'.", uz: "Toʻgʻrisi: married to." },
  },
];

export function mockCorrections(text: string, lang: Lang, pro: boolean): Correction[] {
  const out: Correction[] = [];
  for (const r of RULES) {
    const m = text.match(r.re);
    if (!m) continue;
    const original = m[0].trim();
    const corrected = keepCase(m[0].trim(), r.fix(m).trim());
    if (original === corrected) continue;
    out.push({
      original,
      corrected,
      explanation: r.expl[lang],
      category: r.category,
      ...(pro && r.rule ? { rule: r.rule[lang] } : {}),
      ...(pro && r.examples ? { examples: r.examples } : {}),
    });
    if (out.length >= 3) break;
  }
  return out;
}

const ACKS: Record<string, string[]> = {
  low: ["Nice!", "Great!", "Good job!", "Cool!", "I see."],
  high: ["That's a fascinating point.", "Interesting perspective.", "I see what you mean.", "Fair enough.", "That makes sense."],
};

export function mockChat(opts: {
  text: string;
  level: Level;
  topicSlug?: string | null;
  turn: number;
  lang: Lang;
  pro: boolean;
}): ChatOut {
  const topic = topicBySlug(opts.topicSlug);
  const qs = topic?.questions ?? [
    "Tell me more about that.",
    "What do you like doing in your free time?",
    "What are you planning to do this weekend?",
    "Why are you learning English?",
  ];
  const high = ["B2", "C1", "C2"].includes(opts.level);
  const acks = ACKS[high ? "high" : "low"];
  const corrections = mockCorrections(opts.text, opts.lang, opts.pro);
  const ack = acks[opts.turn % acks.length];
  const q = qs[opts.turn % qs.length];
  const words = opts.text.trim().split(/\s+/).length;
  const nudge =
    words < 4 && opts.turn > 0
      ? high
        ? " Could you expand on that a little?"
        : " Can you say a full sentence?"
      : "";
  const tips: Tip[] = opts.pro ? mockTips(opts.text + " " + q, opts.lang).slice(0, 2) : [];
  return { reply: `${ack}${nudge} ${q}`, corrections, tips };
}

const SOUND_TIPS: { re: RegExp; tip: L3 }[] = [
  { re: /th/, tip: { ru: "Звук th: кончик языка между зубами, мягко выдохните.", en: "For 'th', put your tongue tip between your teeth and breathe out gently.", uz: "th tovushi: til uchini tishlar orasiga qoʻyib, sekin nafas chiqaring." } },
  { re: /^w|wh/, tip: { ru: "Звук w: губы трубочкой, без зубов — не «в».", en: "For 'w', round your lips — don't touch your teeth like a 'v'.", uz: "w tovushi: lablarni dumaloq qiling, tishlarga tegizmang — «v» emas." } },
  { re: /^v/, tip: { ru: "Звук v: верхние зубы касаются нижней губы.", en: "For 'v', touch your top teeth to your bottom lip.", uz: "v tovushi: yuqori tishlar pastki labga tegadi." } },
  { re: /r/, tip: { ru: "Английский r не раскатистый: язык не касается нёба.", en: "The English 'r' isn't rolled — your tongue doesn't touch the roof of your mouth.", uz: "Inglizcha r titramaydi — til tanglayga tegmaydi." } },
  { re: /^h/, tip: { ru: "h — лёгкий выдох, не «х».", en: "'h' is just a soft breath, not a harsh 'kh'.", uz: "h — yengil nafas, «x» emas." } },
  { re: /ee|ea|ie/, tip: { ru: "Долгий звук iː — тяните его чуть дольше.", en: "Hold the long 'iː' sound a little longer.", uz: "Choʻziq iː tovushini biroz uzunroq ayting." } },
];

export function mockTips(text: string, lang: Lang): Tip[] {
  const words = [...new Set(text.toLowerCase().match(/[a-z']+/g) ?? [])];
  const tips: Tip[] = [];
  for (const w of words) {
    const ipa = IPA[w];
    const sound = SOUND_TIPS.find((s) => s.re.test(w));
    if (ipa && sound) tips.push({ word: w, ipa: `/${ipa}/`, tip: sound.tip[lang] });
  }
  return tips;
}

const SUMMARY: Record<"great" | "good" | "work", L3> = {
  great: { ru: "Отлично! Произношение очень чёткое.", en: "Excellent! Your pronunciation is very clear.", uz: "Ajoyib! Talaffuzingiz juda aniq." },
  good: { ru: "Хорошо! Поработаем над несколькими словами.", en: "Good! Let's polish a few words.", uz: "Yaxshi! Bir nechta soʻz ustida ishlaymiz." },
  work: { ru: "Попробуйте ещё раз медленнее — обратите внимание на выделенные слова.", en: "Try again a bit slower and focus on the highlighted words.", uz: "Sekinroq qayta urinib koʻring — ajratilgan soʻzlarga eʼtibor bering." },
};

export function mockPronunciation(missed: string[], score: number, lang: Lang): PronunciationOut {
  const summary = SUMMARY[score >= 90 ? "great" : score >= 60 ? "good" : "work"][lang];
  const tips: Tip[] = missed.slice(0, 4).map((w) => {
    const sound = SOUND_TIPS.find((s) => s.re.test(w));
    return {
      word: w,
      ipa: IPA[w] ? `/${IPA[w]}/` : "",
      tip:
        sound?.tip[lang] ??
        { ru: "Произнесите слово по слогам, затем слитно.", en: "Say the word syllable by syllable, then together.", uz: "Soʻzni boʻgʻinlab, keyin qoʻshib ayting." }[lang],
    };
  });
  return { summary, tips };
}

const QUIZ_TITLE: L3 = { ru: "Практика", en: "Practice", uz: "Mashq" };

export function mockQuiz(opts: { level: Level; lang: Lang; topicTitle?: string; pro: boolean; speakText?: string }): QuizData {
  const bank = [...QUIZ_BANK[opts.level], ...(opts.level === "A1" ? [] : QUIZ_BANK.A2.slice(0, 4))];
  const picked = shuffle(bank).slice(0, 7);
  const questions: Question[] = picked.map((item) => {
    if (item.type === "choice")
      return { type: "choice", prompt: item.prompt, options: item.options, answer: item.answer, explanation: item.explanation?.[opts.lang] };
    if (item.type === "order") return { type: "order", prompt: item.prompt[opts.lang], answer: item.answer };
    // A "translate into English" task makes no sense when the interface is English.
    if (opts.lang === "en") return { type: "order", prompt: "Put the words in order", answer: item.answer.replace(/[?.!]$/, "") };
    return { type: "translate", prompt: item.prompt[opts.lang], answer: item.answer, accept: item.accept };
  });
  if (opts.pro && opts.speakText) questions.push({ type: "speak", text: opts.speakText });
  return { title: opts.topicTitle ?? QUIZ_TITLE[opts.lang], questions };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Goals whose keywords appear anywhere in the learner's messages. */
export function missionGoalsByKeywords(mission: Mission, history: ChatTurn[]) {
  const said = history.filter((m) => m.role === "user").map((m) => ` ${m.content.toLowerCase()} `).join(" ");
  return mission.goals.filter((g) => g.keywords.some((k) => said.includes(k.toLowerCase()))).map((g) => g.id);
}

/** Scripted mission partner: follows the lesson's script and checks goals by keywords. */
export function mockMission(opts: { mission: Mission; history: ChatTurn[]; lang: Lang }): MissionOut {
  // The opener is the first assistant turn; the script answers the learner's replies after it.
  const turn = Math.max(0, opts.history.filter((m) => m.role === "assistant").length - 1);
  const last = opts.history[opts.history.length - 1]?.content ?? "";
  const goalsDone = missionGoalsByKeywords(opts.mission, opts.history);
  const script = opts.mission.script;
  const finished = goalsDone.length === opts.mission.goals.length || turn >= script.length - 1;
  // Once every goal is reached the partner wraps up with the script's last line.
  const reply = (goalsDone.length === opts.mission.goals.length ? script.at(-1) : script[Math.min(turn, script.length - 1)]) ?? "Thank you!";
  return { reply, corrections: mockCorrections(last, opts.lang, false), goalsDone, finished };
}
