import { test } from "node:test";
import assert from "node:assert/strict";
import { embedUrl } from "./video.ts";

test("embedUrl understands YouTube and Vimeo links", () => {
  assert.equal(embedUrl("https://www.youtube.com/watch?v=abc123"), "https://www.youtube-nocookie.com/embed/abc123");
  assert.equal(embedUrl("https://youtu.be/abc123"), "https://www.youtube-nocookie.com/embed/abc123");
  assert.equal(embedUrl("https://vimeo.com/76979871"), "https://player.vimeo.com/video/76979871");
  assert.equal(embedUrl("https://example.com/video.mp4"), null);
  assert.equal(embedUrl(""), null);
});
