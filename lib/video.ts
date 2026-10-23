/** Turns a YouTube, Vimeo or HeyGen link into an embeddable player URL. */
export function embedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === "vimeo.com") {
    const id = u.pathname.match(/^\/(\d+)/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (host === "player.vimeo.com") return url;
  if (host === "app.heygen.com") {
    const id = u.pathname.match(/^\/(?:share|embeds|videos)\/([\w-]+)/)?.[1];
    return id ? `https://app.heygen.com/embeds/${id}` : null;
  }
  return null;
}

/** YouTube Shorts links are vertical (9:16) videos, shown in a tall player. */
export function isVertical(url: string | null | undefined): boolean {
  return !!url && /youtube\.com\/shorts\//.test(url);
}

/** Videos uploaded to the site's own storage, played with a plain <video> player. */
export const VIDEO_BUCKET = "lesson-videos";

export function isFileVideo(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).pathname.includes(`/storage/v1/object/public/${VIDEO_BUCKET}/`);
  } catch {
    return false;
  }
}

/** Any link the site can play: an uploaded file or a YouTube, Vimeo or HeyGen link. */
export function isPlayableVideo(url: string | null | undefined): boolean {
  return isFileVideo(url) || embedUrl(url) !== null;
}
