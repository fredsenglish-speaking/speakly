// Books and films we recommend for each level. Only titles and short notes: nothing is hosted here.
import type { Level } from "./levels.ts";

export type LibraryKind = "book" | "film" | "series";

export type LibraryItem = {
  kind: LibraryKind;
  title: string;
  /** Author for a book, year for a film or series. */
  by: string;
  /** True when the student should look for the easy (graded reader) edition. */
  graded?: boolean;
  /** A free, legal copy of the original text (public domain, Project Gutenberg). */
  free?: string;
  about: { az: string; en: string; ru: string };
};

export const LIBRARY: Record<Level, LibraryItem[]> = {
  A1: [
    { kind: "book", free: "https://www.gutenberg.org/ebooks/55", title: "The Wonderful Wizard of Oz", by: "L. Frank Baum", graded: true, about: {
      az: "Dorotinin sehrli ölkəyə səyahəti. Qısa cümlələr və tanış sözlər.",
      en: "Dorothy's trip to a magic land. Short sentences and familiar words.",
      ru: "Путешествие Дороти в волшебную страну. Короткие предложения и знакомые слова." } },
    { kind: "book", free: "https://www.gutenberg.org/ebooks/11", title: "Alice's Adventures in Wonderland", by: "Lewis Carroll", graded: true, about: {
      az: "Alisa dovşanın arxasınca qəribə bir dünyaya düşür. Sadə nağıl dili.",
      en: "Alice follows a rabbit into a strange world. Simple fairy-tale language.",
      ru: "Алиса попадает за кроликом в странный мир. Простой сказочный язык." } },
    { kind: "book", free: "https://www.gutenberg.org/ebooks/16", title: "Peter Pan", by: "J. M. Barrie", graded: true, about: {
      az: "Heç vaxt böyüməyən oğlan haqqında məşhur hekayə.",
      en: "The famous story of the boy who never grows up.",
      ru: "Знаменитая история о мальчике, который никогда не взрослеет." } },
    { kind: "book", free: "https://www.gutenberg.org/ebooks/521", title: "Robinson Crusoe", by: "Daniel Defoe", graded: true, about: {
      az: "Adada tək qalan adam. Gündəlik həyat sözləri çoxdur.",
      en: "A man alone on an island. Lots of everyday words.",
      ru: "Человек один на острове. Много слов из повседневной жизни." } },
    { kind: "series", title: "Extra English (Extr@)", by: "2002", about: {
      az: "İngilis dilini öyrənənlər üçün çəkilmiş komediya serialı. Yavaş və aydın danışırlar.",
      en: "A comedy series made for English learners. They speak slowly and clearly.",
      ru: "Комедийный сериал, снятый для изучающих английский. Говорят медленно и чётко." } },
    { kind: "series", title: "Peppa Pig", by: "2004", about: {
      az: "Uşaq cizgi filmi, amma yeni başlayanlar üçün əladır: qısa, sadə dialoqlar.",
      en: "A cartoon for children, but great for beginners: short, simple dialogues.",
      ru: "Детский мультфильм, но отлично подходит новичкам: короткие простые диалоги." } },
    { kind: "film", title: "Finding Nemo", by: "2003", about: {
      az: "Ata balıq oğlunu axtarır. Aydın danışıq və çox təkrar olunan ifadələr.",
      en: "A father fish looks for his son. Clear speech and many repeated phrases.",
      ru: "Рыба-папа ищет сына. Чёткая речь и много повторяющихся фраз." } },
    { kind: "film", title: "Paddington", by: "2014", about: {
      az: "Nəzakətli ayı Londona gəlir. Gözəl Britaniya tələffüzü.",
      en: "A polite bear comes to London. Lovely British pronunciation.",
      ru: "Вежливый медвежонок приезжает в Лондон. Красивое британское произношение." } },
  ],
  A2: [
    { kind: "book", free: "https://www.gutenberg.org/ebooks/74", title: "The Adventures of Tom Sawyer", by: "Mark Twain", graded: true, about: {
      az: "Tom və dostlarının çay sahilindəki macəraları. Keçmiş zaman üçün çox yaxşıdır.",
      en: "Tom and his friends' adventures by the river. Very good for the past tense.",
      ru: "Приключения Тома и его друзей у реки. Очень хорошо для прошедшего времени." } },
    { kind: "book", free: "https://www.gutenberg.org/ebooks/271", title: "Black Beauty", by: "Anna Sewell", graded: true, about: {
      az: "Bir atın öz həyatını danışdığı mehriban hekayə.",
      en: "A kind story told by a horse about its own life.",
      ru: "Добрая история, которую лошадь рассказывает о своей жизни." } },
    { kind: "book", title: "Charlie and the Chocolate Factory", by: "Roald Dahl", about: {
      az: "Şokolad fabrikinə qızıl bilet. Orijinal mətn belə asan və əyləncəlidir.",
      en: "A golden ticket to a chocolate factory. Even the original text is easy and fun.",
      ru: "Золотой билет на шоколадную фабрику. Даже оригинал читается легко и весело." } },
    { kind: "book", title: "Diary of a Wimpy Kid", by: "Jeff Kinney", about: {
      az: "Məktəbli oğlanın şəkilli gündəliyi. Danışıq dili və gülməli səhnələr.",
      en: "A schoolboy's diary with pictures. Everyday spoken English and funny scenes.",
      ru: "Дневник школьника с картинками. Разговорный язык и смешные сцены." } },
    { kind: "film", title: "Up", by: "2009", about: {
      az: "Yaşlı kişi evini şarlarla uçurur. Az dialoq, aydın danışıq.",
      en: "An old man flies his house with balloons. Not much dialogue, clear speech.",
      ru: "Старик улетает на доме с воздушными шарами. Мало диалогов, чёткая речь." } },
    { kind: "film", title: "The Lion King", by: "1994", about: {
      az: "Kiçik aslan Simbanın hekayəsi. Mahnılar sözləri yadda saxlamağa kömək edir.",
      en: "The story of the little lion Simba. The songs help you remember words.",
      ru: "История львёнка Симбы. Песни помогают запоминать слова." } },
    { kind: "film", title: "Zootopia", by: "2016", about: {
      az: "Dovşan polis heyvanlar şəhərində bir sirri açır. Gündəlik ifadələr çoxdur.",
      en: "A rabbit police officer solves a mystery in an animal city. Lots of everyday phrases.",
      ru: "Крольчиха-полицейский раскрывает тайну в городе зверей. Много бытовых фраз." } },
    { kind: "series", title: "Friends", by: "1994", about: {
      az: "Nyu-Yorkda altı dost. Qısa seriyalar, real danışıq dili. İngilis altyazısı ilə izləyin.",
      en: "Six friends in New York. Short episodes and real spoken English. Watch with English subtitles.",
      ru: "Шесть друзей в Нью-Йорке. Короткие серии и живой разговорный язык. Смотрите с английскими субтитрами." } },
  ],
  B1: [
    { kind: "book", title: "Harry Potter and the Philosopher's Stone", by: "J. K. Rowling", about: {
      az: "Sehrbazlar məktəbində ilk il. Çoxlarının oxuduğu ilk orijinal ingilis kitabı.",
      en: "A first year at a school for wizards. The first original English book for many learners.",
      ru: "Первый год в школе волшебников. Первая книга в оригинале для многих учеников." } },
    { kind: "book", title: "Wonder", by: "R. J. Palacio", about: {
      az: "Fərqli üzlü oğlan məktəbə gedir. Qısa fəsillər, sadə və təsirli dil.",
      en: "A boy with a different face starts school. Short chapters, simple and moving language.",
      ru: "Мальчик с необычным лицом идёт в школу. Короткие главы, простой и трогательный язык." } },
    { kind: "book", title: "Holes", by: "Louis Sachar", about: {
      az: "Səhvən düşərgəyə göndərilən oğlan və gizli xəzinə. Maraqlı və anlaşıqlı.",
      en: "A boy sent to a camp by mistake and a hidden treasure. Gripping and easy to follow.",
      ru: "Мальчик, по ошибке попавший в лагерь, и спрятанный клад. Увлекательно и понятно." } },
    { kind: "book", free: "https://www.gutenberg.org/ebooks/1661", title: "The Adventures of Sherlock Holmes", by: "Arthur Conan Doyle", graded: true, about: {
      az: "Məşhur detektivin qısa hekayələri. Hər hekayə bir axşama oxunur.",
      en: "Short stories about the famous detective. Each story takes one evening.",
      ru: "Короткие рассказы о знаменитом сыщике. Каждый читается за вечер." } },
    { kind: "film", title: "Forrest Gump", by: "1994", about: {
      az: "Sadə ürəkli adamın qeyri-adi həyatı. Yavaş danışıq, unudulmaz ifadələr.",
      en: "The unusual life of a simple-hearted man. Slow speech and famous lines.",
      ru: "Необычная жизнь простодушного человека. Неспешная речь и знаменитые фразы." } },
    { kind: "film", title: "The Devil Wears Prada", by: "2006", about: {
      az: "Gənc qız moda jurnalında işləyir. İş və ofis dili üçün yaxşıdır.",
      en: "A young woman works at a fashion magazine. Good for work and office English.",
      ru: "Девушка работает в модном журнале. Хорошо для рабочей и офисной лексики." } },
    { kind: "film", title: "Notting Hill", by: "1999", about: {
      az: "Londonlu kitab satıcısı və məşhur aktrisa. Britaniya danışıq dili.",
      en: "A London bookseller and a famous actress. British everyday English.",
      ru: "Лондонский продавец книг и знаменитая актриса. Британский разговорный язык." } },
    { kind: "series", title: "Modern Family", by: "2009", about: {
      az: "Bir böyük ailənin gündəlik həyatı. Qısa seriyalar, çoxlu ailə və ev sözləri.",
      en: "The everyday life of one big family. Short episodes, lots of family and home words.",
      ru: "Повседневная жизнь большой семьи. Короткие серии, много слов о семье и доме." } },
  ],
  B2: [
    { kind: "book", title: "Animal Farm", by: "George Orwell", about: {
      az: "Fermadakı heyvanlar hakimiyyəti ələ alır. Qısa, amma dərin mənalı kitab.",
      en: "The animals on a farm take power. A short book with a deep meaning.",
      ru: "Животные на ферме захватывают власть. Короткая книга с глубоким смыслом." } },
    { kind: "book", title: "Of Mice and Men", by: "John Steinbeck", about: {
      az: "İki dostun Amerikada iş və arzu axtarışı. Canlı dialoqlar.",
      en: "Two friends look for work and a dream in America. Lively dialogues.",
      ru: "Двое друзей ищут работу и мечту в Америке. Живые диалоги." } },
    { kind: "book", title: "The Hunger Games", by: "Suzanne Collins", about: {
      az: "Gələcəkdə həyat üçün mübarizə. Sürətli süjet, müasir dil.",
      en: "A fight for survival in the future. Fast plot, modern language.",
      ru: "Борьба за выживание в будущем. Быстрый сюжет, современный язык." } },
    { kind: "book", title: "The Old Man and the Sea", by: "Ernest Hemingway", about: {
      az: "Qoca balıqçı və nəhəng balıq. Sadə cümlələrlə yazılmış klassik əsər.",
      en: "An old fisherman and a giant fish. A classic written in simple sentences.",
      ru: "Старый рыбак и огромная рыба. Классика, написанная простыми предложениями." } },
    { kind: "film", title: "The King's Speech", by: "2010", about: {
      az: "Kral nitq qüsurunu aradan qaldırmağa çalışır. Tələffüz üçün ideal film.",
      en: "A king works to overcome his stammer. Ideal for pronunciation.",
      ru: "Король борется со своим заиканием. Идеальный фильм для работы над произношением." } },
    { kind: "film", title: "The Pursuit of Happyness", by: "2006", about: {
      az: "Ata və oğulun çətin həyatdan uğura yolu. Real gündəlik danışıq.",
      en: "A father and son's way from a hard life to success. Real everyday speech.",
      ru: "Путь отца и сына от тяжёлой жизни к успеху. Живая повседневная речь." } },
    { kind: "film", title: "The Social Network", by: "2010", about: {
      az: "Facebook-un yaranma hekayəsi. Sürətli, ağıllı dialoqlar.",
      en: "How Facebook was started. Fast, clever dialogues.",
      ru: "История создания Facebook. Быстрые, остроумные диалоги." } },
    { kind: "series", title: "Sherlock", by: "2010", about: {
      az: "Şerlok Holms müasir Londonda. Zəngin söz ehtiyatı və Britaniya ləhcəsi.",
      en: "Sherlock Holmes in modern London. Rich vocabulary and British accents.",
      ru: "Шерлок Холмс в современном Лондоне. Богатая лексика и британский акцент." } },
  ],
  C1: [
    { kind: "book", title: "To Kill a Mockingbird", by: "Harper Lee", about: {
      az: "Kiçik qızın gözü ilə ədalət və irqçilik haqqında Amerika klassiki.",
      en: "An American classic about justice and racism, seen through a young girl's eyes.",
      ru: "Американская классика о справедливости и расизме глазами маленькой девочки." } },
    { kind: "book", title: "Nineteen Eighty-Four", by: "George Orwell", about: {
      az: "Hər şeyi izləyən dövlət haqqında məşhur roman. Mürəkkəb fikirlər, aydın dil.",
      en: "The famous novel about a state that watches everyone. Complex ideas, clear language.",
      ru: "Знаменитый роман о государстве, которое следит за всеми. Сложные идеи, ясный язык." } },
    { kind: "book", free: "https://www.gutenberg.org/ebooks/1342", title: "Pride and Prejudice", by: "Jane Austen", about: {
      az: "Elizabet və mister Darsi. Klassik ingilis dili və incə yumor.",
      en: "Elizabeth and Mr Darcy. Classic English and gentle humour.",
      ru: "Элизабет и мистер Дарси. Классический английский и тонкий юмор." } },
    { kind: "book", title: "Sapiens", by: "Yuval Noah Harari", about: {
      az: "Bəşəriyyətin qısa tarixi. Elmi-populyar dil və müzakirə üçün mövzular.",
      en: "A short history of humankind. Popular-science English and topics for discussion.",
      ru: "Краткая история человечества. Научно-популярный язык и темы для обсуждения." } },
    { kind: "film", title: "The Imitation Game", by: "2014", about: {
      az: "Alan Türinq müharibədə şifrəni açır. Ağıllı, formal Britaniya ingiliscəsi.",
      en: "Alan Turing breaks a code in the war. Clever, formal British English.",
      ru: "Алан Тьюринг взламывает шифр во время войны. Умный, формальный британский английский." } },
    { kind: "film", title: "Dead Poets Society", by: "1989", about: {
      az: "Müəllim tələbələrinə şeiri sevdirir. Ədəbi dil və təsirli nitqlər.",
      en: "A teacher makes his students love poetry. Literary language and moving speeches.",
      ru: "Учитель прививает ученикам любовь к поэзии. Литературный язык и сильные речи." } },
    { kind: "film", title: "Pride & Prejudice", by: "2005", about: {
      az: "Ostinin romanının film versiyası. Kitabla birlikdə izləyin.",
      en: "The film of Austen's novel. Watch it together with the book.",
      ru: "Экранизация романа Остин. Смотрите вместе с книгой." } },
    { kind: "series", title: "Downton Abbey", by: "2010", about: {
      az: "Bir aristokrat ailə və onların xidmətçiləri. Müxtəlif ləhcələr və nəzakətli dil.",
      en: "An aristocratic family and their servants. Different accents and polite language.",
      ru: "Аристократическая семья и её слуги. Разные акценты и вежливая речь." } },
  ],
  C2: [
    { kind: "book", title: "The Remains of the Day", by: "Kazuo Ishiguro", about: {
      az: "Yaşlı butler keçmişini xatırlayır. İncə, çox dəqiq ingilis dili.",
      en: "An old butler looks back on his past. Subtle, very precise English.",
      ru: "Старый дворецкий вспоминает прошлое. Тонкий, очень точный английский." } },
    { kind: "book", free: "https://www.gutenberg.org/ebooks/1260", title: "Jane Eyre", by: "Charlotte Brontë", about: {
      az: "Yetim qızın müstəqillik yolu. Zəngin XIX əsr ədəbi dili.",
      en: "An orphan girl's path to independence. Rich 19th-century literary language.",
      ru: "Путь сироты к независимости. Богатый литературный язык XIX века." } },
    { kind: "book", title: "Lord of the Flies", by: "William Golding", about: {
      az: "Adada qalan uşaqlar öz qaydalarını qurur. Simvollarla dolu klassik.",
      en: "Boys stranded on an island make their own rules. A classic full of symbols.",
      ru: "Мальчики на острове устанавливают свои правила. Классика, полная символов." } },
    { kind: "book", title: "Atonement", by: "Ian McEwan", about: {
      az: "Bir səhv ittiham bütün həyatları dəyişir. Müasir ədəbi üslub.",
      en: "One false accusation changes several lives. Modern literary style.",
      ru: "Одно ложное обвинение меняет несколько жизней. Современный литературный стиль." } },
    { kind: "film", title: "12 Angry Men", by: "1957", about: {
      az: "On iki münsif bir otaqda mübahisə edir. Arqument və müzakirə dili üçün ən yaxşısı.",
      en: "Twelve jurors argue in one room. The best film for the language of argument.",
      ru: "Двенадцать присяжных спорят в одной комнате. Лучший фильм для языка аргументации." } },
    { kind: "film", title: "The Big Short", by: "2015", about: {
      az: "2008 maliyyə böhranı. Çətin iqtisadi terminlər və sürətli danışıq.",
      en: "The 2008 financial crisis. Hard economic terms and fast speech.",
      ru: "Финансовый кризис 2008 года. Сложные экономические термины и быстрая речь." } },
    { kind: "film", title: "Spotlight", by: "2015", about: {
      az: "Jurnalistlər böyük bir qalmaqalı araşdırır. Peşəkar və hüquqi dil.",
      en: "Journalists investigate a big scandal. Professional and legal language.",
      ru: "Журналисты расследуют громкий скандал. Профессиональный и юридический язык." } },
    { kind: "series", title: "Yes, Minister", by: "1980", about: {
      az: "Nazir və onun hiyləgər katibi. Britaniya yumoru və söz oyunları.",
      en: "A minister and his clever civil servant. British humour and wordplay.",
      ru: "Министр и его хитрый чиновник. Британский юмор и игра слов." } },
  ],
};

/** Where to read more about an item: Open Library for books, IMDb for films and series. */
export function libraryLink(item: LibraryItem): string {
  if (item.kind === "book") {
    return `https://openlibrary.org/search?q=${encodeURIComponent(`${item.title} ${item.by}`)}`;
  }
  return `https://www.imdb.com/find/?q=${encodeURIComponent(`${item.title} ${item.by}`)}`;
}

/** A YouTube search for the official trailer of a film or series. */
export function trailerLink(item: LibraryItem): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.title} ${item.by} official trailer`)}`;
}

export function libraryFor(level: Level, part: "books" | "films"): LibraryItem[] {
  return LIBRARY[level].filter((x) => (part === "books" ? x.kind === "book" : x.kind !== "book"));
}
