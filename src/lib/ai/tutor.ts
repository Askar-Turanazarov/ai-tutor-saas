import "server-only";
import { runJSON } from "./router";
import { ChatOutSchema, MissionOutSchema, PronunciationOutSchema, QuizSchema } from "./schemas";
import { mockChat, mockMission, mockPronunciation, mockQuiz, type Lang } from "./mock";
import type { Mission } from "../content/types";
import type { ChatTurn } from "./types";
import type { Level } from "../levels";

const LANG_NAME: Record<Lang, string> = {
  ru: "Russian",
  en: "English",
  uz: "Uzbek (Latin script)",
};

const LEVEL_STYLE: Record<Level, string> = {
  A1: "Use very short, simple sentences (max ~10 words), present tense, the 500 most common words.",
  A2: "Use short simple sentences, common past and future forms, everyday vocabulary.",
  B1: "Use natural everyday English with some phrasal verbs; sentences of moderate length.",
  B2: "Use natural fluent English with idiomatic expressions and varied structures.",
  C1: "Use sophisticated, nuanced English; challenge the student with abstract ideas.",
  C2: "Speak as to an educated native speaker: idioms, irony, subtle register shifts.",
};

const PERSONA = `You are "Ustoz", a warm, encouraging personal English tutor based in Tashkent, Uzbekistan.
Your students speak Uzbek and/or Russian. When natural, draw on local context (Tashkent metro, Chorsu bazaar, plov, Navruz, Samarkand)
but never force it. Never mention that you are an AI model or which company made you.`;

export async function tutorReply(opts: {
  userId: string;
  history: ChatTurn[];
  level: Level;
  lang: Lang;
  pro: boolean;
  topic?: { slug: string; title: string } | null;
}) {
  const last = opts.history[opts.history.length - 1]?.content ?? "";
  const turn = opts.history.filter((m) => m.role === "assistant").length;

  const analysis = opts.pro
    ? `Analyse ONLY the student's latest message. For every real mistake (grammar, vocabulary, word order, spelling, unnatural phrasing) add a correction with:
"original" (the wrong fragment), "corrected" (the fixed fragment), "category" (grammar|vocabulary|spelling|punctuation|style),
"explanation" (1–2 sentences), "rule" (the underlying rule, short), "examples" (2 short English example sentences).
Also add up to 2 "tips" for words from the student's message or your reply that Uzbek/Russian speakers often mispronounce:
{"word","ipa" (in slashes),"tip" (how to articulate it)}.`
    : `Analyse ONLY the student's latest message. For each clear mistake add a correction with "original", "corrected", "category"
and a one-sentence, very simple "explanation". Do not include rules or examples. Leave "tips" empty.`;

  const system = `${PERSONA}

Student level: ${opts.level} (CEFR). ${LEVEL_STYLE[opts.level]}
${opts.topic ? `Conversation topic: ${opts.topic.title}. Keep the conversation on this topic.` : "Free conversation."}

Reply in English, 1–4 sentences, and usually end with a question so the student keeps talking.
If the student writes in Russian or Uzbek, gently answer in English and encourage them to try in English.
${analysis}
Write "explanation", "rule" and "tip" texts in ${LANG_NAME[opts.lang]}. Ignore missing final punctuation and capitalisation at the start of a message.
If there are no mistakes, return an empty "corrections" array.

Return JSON: {"reply": string, "corrections": [...], "tips": [...]}`;

  return runJSON({
    task: "chat",
    userId: opts.userId,
    system,
    messages: opts.history.slice(-20),
    schema: ChatOutSchema,
    fallback: () =>
      mockChat({ text: last, level: opts.level, topicSlug: opts.topic?.slug, turn, lang: opts.lang, pro: opts.pro }),
  });
}

export async function generateQuiz(opts: {
  userId: string;
  level: Level;
  lang: Lang;
  pro: boolean;
  topicTitle: string;
  mistakes: { original: string; corrected: string; category: string }[];
  speakText?: string;
}) {
  const mistakes = opts.mistakes.length
    ? `The student recently made these mistakes — build at least 3 questions that practise the same points:\n${opts.mistakes
        .map((m) => `- "${m.original}" → "${m.corrected}" (${m.category})`)
        .join("\n")}`
    : "";

  const system = `${PERSONA}
You create short Duolingo-style quizzes. Student level: ${opts.level}. ${LEVEL_STYLE[opts.level]}
Topic: ${opts.topicTitle}.
${mistakes}

Create 8 questions mixing these types:
- {"type":"choice","prompt": English sentence with ___ or a question,"options":[3–4 options],"answer": index of correct option (0-based),"explanation": short explanation in ${LANG_NAME[opts.lang]}}
- {"type":"order","prompt": ${opts.lang === "en" ? '"Put the words in order"' : `the meaning of the sentence in ${LANG_NAME[opts.lang]}`},"answer": an English sentence of 4–9 words without final punctuation}
${opts.lang === "en" ? "" : `- {"type":"translate","prompt": a sentence in ${LANG_NAME[opts.lang]},"answer": its natural English translation,"accept": [other correct translations]}`}
- {"type":"gap","prompt": English sentence with ___ for a collocation or phrasal verb,"answer": the missing word(s),"explanation": short explanation in ${LANG_NAME[opts.lang]}}
- {"type":"spot","sentence": a natural-looking English sentence with ONE typical learner mistake,"wrong": the exact wrong words as they appear in the sentence,"right": the correct words,"explanation": why, in ${LANG_NAME[opts.lang]}}
- {"type":"dialogue","line": what someone says,"options": [3 possible replies],"answer": index of the most natural reply,"explanation": optional}
${opts.pro ? '- exactly one {"type":"speak","text": an English sentence of 5–10 words with sounds that are hard for Uzbek/Russian speakers}' : ""}
At least 3 questions must be "choice", at least one "gap" and one "spot". Exactly one option is correct. Title: a short title for the quiz in ${LANG_NAME[opts.lang]}.

Return JSON: {"title": string, "questions": [...]}`;

  return runJSON({
    task: "quiz",
    // A wrong answer key ruins a quiz, so allow a little reasoning here; it is also a longer answer.
    reasoning: "low",
    hedgeMs: 12_000,
    userId: opts.userId,
    system,
    messages: [{ role: "user", content: "Create the quiz." }],
    schema: QuizSchema,
    temperature: 0.9,
    fallback: () =>
      mockQuiz({ level: opts.level, lang: opts.lang, topicTitle: opts.topicTitle, pro: opts.pro, speakText: opts.speakText }),
  });
}

export async function pronunciationFeedback(opts: {
  userId: string;
  target: string;
  heard: string;
  missed: string[];
  score: number;
  lang: Lang;
}) {
  const system = `${PERSONA}
You are a pronunciation coach. The student tried to say: "${opts.target}"
Speech recognition heard: "${opts.heard}"
Words that were missed or misheard: ${opts.missed.length ? opts.missed.join(", ") : "none"}. Accuracy: ${opts.score}%.

Give a short encouraging "summary" (1–2 sentences) and for each missed word (max 4) a tip:
{"word","ipa" (British IPA in slashes),"tip" (how to place tongue/lips, typical mistake of Uzbek/Russian speakers)}.
Write "summary" and "tip" in ${LANG_NAME[opts.lang]}.

Return JSON: {"summary": string, "tips": [...]}`;

  return runJSON({
    task: "pronunciation",
    userId: opts.userId,
    system,
    messages: [{ role: "user", content: "Give me feedback." }],
    schema: PronunciationOutSchema,
    temperature: 0.4,
    fallback: () => mockPronunciation(opts.missed, opts.score, opts.lang),
  });
}

/**
 * One turn of a lesson's role-play mission. The model stays in character, marks which goals
 * the learner has reached and gives short corrections. Without a model: the scripted branch.
 */
export async function missionReply(opts: {
  userId: string;
  mission: Mission;
  history: ChatTurn[];
  level: Level;
  lang: Lang;
  scripted: boolean;
}) {
  const fallback = () => mockMission({ mission: opts.mission, history: opts.history, lang: opts.lang });
  if (opts.scripted) return { data: fallback(), provider: "script", model: "script", attempts: 0 };
  const goals = opts.mission.goals.map((g) => `- ${g.id}: ${g.text.en}`).join("\n");
  const system = `${PERSONA}
You are now role-playing for a lesson mission. Stay fully in character as: ${opts.mission.role}.
Scene: ${opts.mission.scene.en}. Student level: ${opts.level}. ${LEVEL_STYLE[opts.level]}
The student must achieve these goals by speaking English with you:
${goals}
Rules: reply in character in 1–3 short sentences and naturally steer the conversation so the student can reach the remaining goals.
Never list the goals or break character. When all goals are reached, wrap up the scene politely and set "finished": true.
"goalsDone": ids of ALL goals reached so far in the whole conversation.
"corrections": only clear mistakes in the student's latest message, each {"original","corrected","category","explanation"} with a one-sentence explanation in ${LANG_NAME[opts.lang]}.

Return JSON: {"reply": string, "corrections": [...], "goalsDone": [...], "finished": boolean}`;
  return runJSON({ task: "chat", userId: opts.userId, system, messages: opts.history.slice(-16), schema: MissionOutSchema, fallback });
}
