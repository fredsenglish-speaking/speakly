import { embedUrl, isFileVideo, isVertical } from "@/lib/video";

export function Video({ url, title, emptyText }: { url: string | null | undefined; title: string; emptyText: string }) {
  if (isFileVideo(url)) {
    // Our own file: the browser's player, so no YouTube buttons cover the picture.
    return <video className="video file" src={url!} title={title} controls playsInline preload="metadata" controlsList="nodownload" />;
  }
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
