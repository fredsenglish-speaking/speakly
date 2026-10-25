import { test } from "node:test";
import assert from "node:assert/strict";
import { LIBRARY, libraryFor, libraryLink, trailerLink } from "./library.ts";
import { LEVELS } from "./levels.ts";

test("every level has books and films, each described in all three languages", () => {
  for (const level of LEVELS) {
    assert.ok(libraryFor(level, "books").length >= 4, level);
    assert.ok(libraryFor(level, "films").length >= 4, level);
    for (const item of LIBRARY[level]) {
      for (const text of Object.values(item.about)) assert.ok(text.trim().length > 10, item.title);
      if (item.free) assert.match(item.free, /^https:\/\/www\.gutenberg\.org\/ebooks\/\d+$/);
    }
  }
});

test("links point to the right sites", () => {
  const book = LIBRARY.A1.find((x) => x.kind === "book")!;
  const film = LIBRARY.A1.find((x) => x.kind === "film")!;
  assert.match(libraryLink(book), /^https:\/\/openlibrary\.org\/search\?q=/);
  assert.match(libraryLink(film), /^https:\/\/www\.imdb\.com\/find\/\?q=/);
  assert.match(trailerLink(film), /^https:\/\/www\.youtube\.com\/results\?search_query=/);
});
