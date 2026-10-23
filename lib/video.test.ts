import { test } from "node:test";
import assert from "node:assert/strict";
import { embedUrl, isFileVideo, isPlayableVideo, isVertical } from "./video.ts";

test("embedUrl understands YouTube and Vimeo links", () => {
  assert.equal(embedUrl("https://www.youtube.com/watch?v=abc123"), "https://www.youtube-nocookie.com/embed/abc123");
  assert.equal(embedUrl("https://youtu.be/abc123"), "https://www.youtube-nocookie.com/embed/abc123");
  assert.equal(embedUrl("https://vimeo.com/76979871"), "https://player.vimeo.com/video/76979871");
  assert.equal(embedUrl("https://example.com/video.mp4"), null);
  assert.equal(embedUrl(""), null);
});

test("embedUrl handles HeyGen share links", () => {
  assert.equal(embedUrl("https://app.heygen.com/share/abc123def"), "https://app.heygen.com/embeds/abc123def");
  assert.equal(embedUrl("https://app.heygen.com/embeds/abc123def"), "https://app.heygen.com/embeds/abc123def");
  assert.equal(embedUrl("https://app.heygen.com/home"), null);
});

test("YouTube Shorts links are vertical", () => {
  assert.equal(isVertical("https://youtube.com/shorts/abc123?si=x"), true);
  assert.equal(embedUrl("https://youtube.com/shorts/abc123?si=x"), "https://www.youtube-nocookie.com/embed/abc123");
  assert.equal(isVertical("https://youtu.be/abc123"), false);
});

test("uploaded lesson videos are played from our storage", () => {
  const url = "https://abc.supabase.co/storage/v1/object/public/lesson-videos/A1/12-1700000000.mp4";
  assert.equal(isFileVideo(url), true);
  assert.equal(isPlayableVideo(url), true);
  assert.equal(isFileVideo("https://abc.supabase.co/storage/v1/object/public/avatars/x.jpg"), false);
  assert.equal(isPlayableVideo("https://example.com/video.mp4"), false);
});
