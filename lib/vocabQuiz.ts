// Builds the vocabulary questions of a lesson from its word list. Everything is
// shuffled with a fixed seed so the server and the browser render the same test.

export type VocabItem = { id: number; kind: "word" | "phrasal"; term: string; az: string; ru: string; example: string };

export type QuizQuestion = {
  key: string;
  question: string;
  options: string[];
  correct: number;
  // Language of the options: English words, or translations in the reader's language.
  optionsLang: "en" | "az" | "ru";
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function seededShuffle<T>(items: T[], seed: string): T[] {
  const out = [...items];
  let s = hash(seed);
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// "My [teacher] is kind." -> answer "teacher", sentence "My _____ is kind."
export function gapAnswer(example: string) {
  return example.match(/\[([^\]]+)\]/)?.[1] ?? "";
}
export function gapSentence(example: string) {
  return example.replace(/\[[^\]]+\]/, "_____");
}

export function translation(item: VocabItem, locale: string) {
  return locale === "ru" ? item.ru : item.az;
}

// The right answer plus three different wrong ones taken from the same kind of item.
function choices(right: string, pool: string[], seed: string) {
  const seen = new Set([right.toLowerCase()]);
  const wrong: string[] = [];
  for (const p of seededShuffle(pool, seed)) {
    if (wrong.length === 3) break;
    if (seen.has(p.toLowerCase())) continue;
    seen.add(p.toLowerCase());
    wrong.push(p);
  }
  const options = seededShuffle([right, ...wrong], seed + "/order");
  return { options, correct: options.indexOf(right) };
}

function gapQuestion(item: VocabItem, all: VocabItem[], tag: string): QuizQuestion {
  const pool = all.filter((v) => v.kind === item.kind && v.id !== item.id).map((v) => gapAnswer(v.example));
  return { key: `${tag}${item.id}`, question: gapSentence(item.example), ...choices(gapAnswer(item.example), pool, `${tag}${item.id}`), optionsLang: "en" };
}

function meaningQuestion(item: VocabItem, all: VocabItem[], locale: "az" | "ru", tag: string, meaningOf: (term: string) => string): QuizQuestion {
  const pool = all.filter((v) => v.kind === item.kind && v.id !== item.id).map((v) => translation(v, locale));
  return { key: `${tag}${item.id}`, question: meaningOf(item.term), ...choices(translation(item, locale), pool, `${tag}${item.id}`), optionsLang: locale };
}

// Vocabulary test: one question per item. Words ask for the meaning (in English, a
// gap to fill instead); phrasal verbs are always a gap in their example.
export function vocabPractice(vocab: VocabItem[], locale: string, meaningOf: (term: string) => string): QuizQuestion[] {
  return vocab.map((v) =>
    v.kind === "word" && locale !== "en" ? meaningQuestion(v, vocab, locale === "ru" ? "ru" : "az", "v", meaningOf) : gapQuestion(v, vocab, "v"),
  );
}

// The vocabulary part of the final test: 7 words and 3 phrasal verbs, asked the
// other way round from the vocabulary test where the reader's language allows it.
export function vocabFinal(vocab: VocabItem[], locale: string, meaningOf: (term: string) => string): QuizQuestion[] {
  const pick = (kind: VocabItem["kind"], n: number) =>
    seededShuffle(
      vocab.filter((v) => v.kind === kind),
      `final${kind}`,
    ).slice(0, n);
  const lang = locale === "ru" ? "ru" : "az";
  return [
    ...pick("word", 7).map((v) => gapQuestion(v, vocab, "f")),
    ...pick("phrasal", 3).map((v) => (locale === "en" ? gapQuestion(v, vocab, "f") : meaningQuestion(v, vocab, lang, "f", meaningOf))),
  ];
}
