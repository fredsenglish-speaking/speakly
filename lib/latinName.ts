// Certificates are in English, so the student's name is written in English letters
// even when they typed it in Azerbaijani or Russian: "Məmmədova" -> "Mammadova",
// "Иванова" -> "Ivanova".
const LETTERS: Record<string, string> = {
  // Azerbaijani Latin
  ə: "a", ç: "ch", ş: "sh", ğ: "gh", ı: "i", ö: "o", ü: "u",
  // Russian and Azerbaijani Cyrillic
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  ә: "a", ғ: "gh", ҹ: "j", һ: "h", ө: "o", ү: "u", ј: "y", ҝ: "g", ҡ: "q",
};

export function latinName(name: string): string {
  return Array.from(name.normalize("NFC"))
    .map((ch) => {
      const lower = ch.toLowerCase();
      const latin = LETTERS[lower];
      if (latin === undefined) return ch;
      if (ch === lower || !latin) return latin;
      return latin[0].toUpperCase() + latin.slice(1);
    })
    .join("")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
