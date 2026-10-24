"""Builds supabase/migrations/0013_c2_content.sql: everything the C2 level needs.

- 6 lessons (lessons below), each with 15 + 15 practice questions (questions.txt,
  same format as supabase/questions/*.txt but all 15 per part)
- vocabulary from supabase/vocab/c2.txt (also in 0009, so a fresh setup gets it too)
- 20 speaking club topics (topics.txt: "## slug | az | en | ru" and 10 questions)
- 4 placement test questions and the C2 video teacher

Run 0012_c2_level.sql before the generated file.
Run: python3 supabase/c2/build.py
"""

import hashlib
import importlib.util
import pathlib
import random

HERE = pathlib.Path(__file__).parent
_spec = importlib.util.spec_from_file_location("vocab_build", HERE.parent / "vocab" / "build.py")
_vocab = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_vocab)
parse_vocab, sql = _vocab.parse, _vocab.sql

OUT = HERE.parent / "migrations" / "0013_c2_content.sql"
PER_PART = 15

# slug, az title, en title, ru title, az summary, en summary, ru summary
LESSONS = [
    ("c2-conditional-inversion", "Şərt cümlələrində inversiya", "Inversion in conditionals", "Инверсия в условных предложениях",
     "If-siz rəsmi şərt: Should you…, Were I…, Had I known…", "Formal conditionals without if: Should you…, Were I…, Had I known…", "Формальные условия без if: Should you…, Were I…, Had I known…"),
    ("c2-hedging", "Hedging: ehtiyatlı danışmaq", "Hedging: sounding careful", "Хеджирование: осторожные формулировки",
     "It would appear that…, tend to, arguably.", "It would appear that…, tend to, arguably.", "It would appear that…, tend to, arguably."),
    ("c2-advanced-passive", "Mürəkkəb passiv", "Advanced passive", "Сложный пассив",
     "He is said to have been…, being told, having been warned.", "He is said to have been…, being told, having been warned.", "He is said to have been…, being told, having been warned."),
    ("c2-concession", "Güzəşt: Much as / Try as I might", "Concession: Much as / Try as I might", "Уступка: Much as / Try as I might",
     "\"Although\" demək üçün zərif yollar.", "Elegant ways to say \"although\".", "Изящные способы сказать «although»."),
    ("c2-modal-nuances", "Modal fellərin incəlikləri", "Modal nuances", "Нюансы модальных глаголов",
     "needn't have, may well, might as well, could hardly.", "needn't have, may well, might as well, could hardly.", "needn't have, may well, might as well, could hardly."),
    ("c2-formal-linkers", "Rəsmi bağlayıcılar", "Formal linkers", "Формальные связки",
     "albeit, notwithstanding, whereby, insofar as, hence.", "albeit, notwithstanding, whereby, insofar as, hence.", "albeit, notwithstanding, whereby, insofar as, hence."),
]

TEST = [
    (21, "___ it not for your help, I would have given up.", ["Were", "Had", "Should", "Did"], 0),
    (22, "Much ___ I admire her work, I can't support this idea.", ["as", "though", "so", "that"], 0),
    (23, "You ___ have cooked; we had already eaten.", ["needn't", "mustn't", "couldn't", "didn't need"], 0),
    (24, "The ancient bridge is believed ___ by the Romans.", ["to have been built", "to build", "being built", "to have built"], 0),
]

TEACHER_EN = (
    "Hello, and welcome to C2, the highest level. I'm Edward, your video teacher.\n\n"
    "In six short lessons, we polish the details that make English truly precise: formal inversion, "
    "hedging, advanced passives, concession, modal nuances and formal linkers.\n\n"
    "Each lesson has a short video, tests and new words. Enjoy the finer points of English. Let's begin!"
)
TEACHER_AZ = (
    "Salam! Mən Edward, C2 səviyyəsi üzrə video müəlliminizəm. Altı qısa dərsdə ingilis dilini tam dəqiq edən "
    "incəlikləri keçəcəyik: rəsmi inversiya, hedging, mürəkkəb passiv, güzəşt, modal fellərin incəlikləri və rəsmi bağlayıcılar."
)
TEACHER_RU = (
    "Здравствуйте! Я Эдвард, ваш видеопреподаватель уровня C2. За шесть коротких уроков мы отточим детали, "
    "которые делают английский по-настоящему точным: инверсию, хеджирование, сложный пассив, уступку, нюансы модальных глаголов и формальные связки."
)


def arr(items):
    return "array[" + ", ".join(sql(i) for i in items) + "]"


def questions():
    rows, slug, part = [], None, None
    for n, line in enumerate((HERE / "questions.txt").read_text().splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        if line.startswith("## "):
            slug, part = line[3:].split()
            part = int(part)
            continue
        fields = [f.strip() for f in line.split(" | ")]
        assert len(fields) == 4, f"questions.txt:{n} needs question | correct | wrong | wrong"
        assert len(set(fields[1:])) == 3, f"questions.txt:{n} options must differ"
        rows.append((slug, part, fields[0], fields[1:]))
    counts = {}
    for slug, part, *_ in rows:
        counts[(slug, part)] = counts.get((slug, part), 0) + 1
    assert set(counts) == {(l[0], p) for l in LESSONS for p in (2, 4)}, "every lesson needs parts 2 and 4"
    assert all(v == PER_PART for v in counts.values()), counts

    values, position = [], {}
    for slug, part, question, (right, *wrong) in rows:
        pos = position.get((slug, part), 1)
        position[(slug, part)] = pos + 1
        options = [right, *wrong]
        seed = int(hashlib.sha1(f"{slug}{part}{question}".encode()).hexdigest(), 16)
        random.Random(seed).shuffle(options)
        values.append(f"({sql(slug)}, {part}, {pos}, {sql(question)}, {arr(options)}, {options.index(right)})")
    return values


def topics():
    values = []
    blocks = (HERE / "topics.txt").read_text().split("## ")[1:]
    assert len(blocks) == 20, "expected 20 topics"
    for pos, block in enumerate(blocks, 1):
        head, *qs = [l.strip() for l in block.strip().splitlines() if l.strip()]
        slug, az, en, ru = [f.strip() for f in head.split("|")]
        assert len(qs) == 10, f"{slug} needs 10 questions"
        values.append(f"({sql(slug)}, 'C2', {pos}, {sql(az)}, {sql(en)}, {sql(ru)},\n  {arr(qs)})")
    return values


def vocab():
    rows = parse_vocab(HERE.parent / "vocab" / "c2.txt")
    values, position = [], {}
    for kind in ("w", "p"):
        for slug, k, term, az, ru, example, *_ in rows:
            if k != kind:
                continue
            pos = position.get(slug, 1)
            position[slug] = pos + 1
            word = "word" if kind == "w" else "phrasal"
            values.append(f"({sql(slug)}, {pos}, '{word}', {sql(term)}, {sql(az)}, {sql(ru)}, {sql(example)})")
    assert set(position) == {l[0] for l in LESSONS}
    return values


def main():
    lessons = [
        f"({sql(s)}, 'C2', {sql(az)}, {sql(en)}, {sql(ru)}, {sql(saz)}, {sql(sen)}, {sql(sru)}, {i})"
        for i, (s, az, en, ru, saz, sen, sru) in enumerate(LESSONS, 1)
    ]
    test = [f"({p}, {sql(q)}, {arr(o)}, {c})" for p, q, o, c in TEST]
    q, t, v = questions(), topics(), vocab()

    OUT.write_text(
        "-- C2 (Proficiency) content: 6 lessons with 15 + 15 practice questions and 25 words each,\n"
        "-- 20 speaking club topics, 4 placement test questions and the C2 video teacher.\n"
        "-- Run 0012_c2_level.sql first. Generated by supabase/c2/build.py. Safe to run twice.\n\n"
        "insert into lessons (slug, level, title, title_en, title_ru, summary, summary_en, summary_ru, position) values\n"
        + ",\n".join(lessons) + "\non conflict (slug) do nothing;\n\n"
        "insert into lesson_questions (lesson_id, part, position, question, options, correct)\n"
        "select l.id, v.part, v.position, v.question, v.options, v.correct\n"
        "from (values\n" + ",\n".join(q) + "\n"
        ") as v(slug, part, position, question, options, correct)\n"
        "join lessons l on l.slug = v.slug\n"
        "where not exists (\n"
        "  select 1 from lesson_questions x where x.lesson_id = l.id and x.part = v.part and x.position = v.position\n"
        ");\n\n"
        "insert into lesson_vocab (lesson_id, position, kind, term, az, ru, example)\n"
        "select l.id, v.position, v.kind, v.term, v.az, v.ru, v.example\n"
        "from (values\n" + ",\n".join(v) + "\n"
        ") as v(slug, position, kind, term, az, ru, example)\n"
        "join lessons l on l.slug = v.slug\n"
        "where not exists (\n"
        "  select 1 from lesson_vocab x where x.lesson_id = l.id and x.position = v.position\n"
        ");\n\n"
        "insert into practice_topics (slug, level, position, title, title_en, title_ru, questions) values\n"
        + ",\n".join(t) + "\non conflict (slug) do nothing;\n\n"
        "insert into test_questions (position, question, options, correct)\n"
        "select v.position, v.question, v.options, v.correct\n"
        "from (values\n" + ",\n".join(test) + "\n"
        ") as v(position, question, options, correct)\n"
        "where not exists (select 1 from test_questions x where x.question = v.question);\n\n"
        "insert into level_teachers (level, name, intro, intro_az, intro_ru) values (\n"
        f"  'C2',\n  'Edward',\n  {sql(TEACHER_EN)},\n  {sql(TEACHER_AZ)},\n  {sql(TEACHER_RU)}\n"
        ") on conflict (level) do nothing;\n\n"
        "notify pgrst, 'reload schema';\n"
    )
    print(f"wrote {len(lessons)} lessons, {len(q)} questions, {len(v)} words, {len(t)} topics to {OUT}")


if __name__ == "__main__":
    main()
