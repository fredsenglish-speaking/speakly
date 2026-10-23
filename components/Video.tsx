import { embedUrl, isVertical } from "@/lib/video";

export function Video({ url, title, emptyText }: { url: string | null | undefined; title: string; emptyText: string }) {
  const src = embedUrl(url);
  if (!src) {
    return (
      <div className="video">
        <span className="small">{emptyText}</span>
      </div>
    );
  }
  return (
    <iframe
      className={isVertical(url) ? "video vertical" : "video"}
      src={src}
      title={title}
      allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
    />
  );
}
