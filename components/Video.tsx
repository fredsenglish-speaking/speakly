import { embedUrl } from "@/lib/video";

export function Video({ url, title }: { url: string | null | undefined; title: string }) {
  const src = embedUrl(url);
  if (!src) {
    return (
      <div className="video">
        <span className="small">Video hələ əlavə olunmayıb</span>
      </div>
    );
  }
  return (
    <iframe
      className="video"
      src={src}
      title={title}
      allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
    />
  );
}
