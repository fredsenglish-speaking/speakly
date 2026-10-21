-- English and Russian titles and summaries for lessons.
-- The Azerbaijani text stays in title / summary.

alter table lessons
  add column if not exists title_en text,
  add column if not exists title_ru text,
  add column if not exists summary_en text,
  add column if not exists summary_ru text;

update lessons set title_en = v.title_en, title_ru = v.title_ru, summary_en = v.summary_en, summary_ru = v.summary_ru
from (values
('a1-to-be',              'To be (am / is / are)',       'To be (am / is / are)',               'Simple sentences about yourself and others.',     'Простые предложения о себе и других.'),
('a1-present-simple',     'Present Simple',              'Present Simple',                      'Daily habits and facts.',                         'Ежедневные привычки и факты.'),
('a1-articles',           'Articles: a / an / the',      'Артикли: a / an / the',               'When to use a, an and the.',                      'Когда употреблять a, an и the.'),
('a1-plurals',            'Plural nouns',                'Множественное число',                 'Regular and irregular plurals.',                  'Правильные и неправильные формы.'),
('a2-past-simple',        'Past Simple',                 'Past Simple',                         'Finished actions in the past.',                   'Завершённые действия в прошлом.'),
('a2-comparatives',       'Comparatives and superlatives','Степени сравнения',                  'Bigger, more interesting, the best.',             'Bigger, more interesting, the best.'),
('a2-going-to',           'Going to',                    'Going to',                            'Plans and predictions.',                          'Планы и прогнозы.'),
('a2-countable',          'Countable and uncountable nouns','Исчисляемые и неисчисляемые',     'Much, many, some, any.',                          'Much, many, some, any.'),
('b1-present-perfect',    'Present Perfect',             'Present Perfect',                     'Linking the past and the present.',               'Связь прошлого с настоящим.'),
('b1-past-continuous',    'Past Continuous',             'Past Continuous',                     'Actions in progress in the past.',                'Длительные действия в прошлом.'),
('b1-first-conditional',  'First Conditional',           'First Conditional',                   'Real future conditions.',                         'Реальные условия в будущем.'),
('b1-must-have-to',       'Must / have to',              'Must / have to',                      'Obligation and rules.',                           'Обязанность и правила.'),
('b2-passive',            'Passive Voice',               'Passive Voice',                       'When the doer of the action doesn''t matter.',    'Когда исполнитель действия не важен.'),
('b2-conditionals',       'Second and Third Conditional','Second и Third Conditional',          'Imaginary and unreal past conditions.',           'Воображаемые и нереальные условия в прошлом.'),
('b2-reported-speech',    'Reported Speech',             'Reported Speech',                     'Passing on what someone said.',                   'Передача чужих слов.'),
('b2-relative-clauses',   'Relative Clauses',            'Relative Clauses',                    'Who, which, whose, that.',                        'Who, which, whose, that.'),
('c1-inversion',          'Inversion',                   'Inversion',                           'Emphatic structures like Never have I…',          'Эмфатические конструкции: Never have I…'),
('c1-mixed-conditionals', 'Mixed Conditionals',          'Mixed Conditionals',                  'Mixing past and present conditions.',             'Смешение прошлых и настоящих условий.'),
('c1-cleft-sentences',    'Cleft Sentences',             'Cleft Sentences',                     'It was… that / What I need is…',                  'It was… that / What I need is…'),
('c1-advanced-modals',    'Advanced Modals',             'Advanced Modals',                     'Must have, might have, should have.',             'Must have, might have, should have.')
) as v(slug, title_en, title_ru, summary_en, summary_ru)
where lessons.slug = v.slug;
