/** Round photo, or initials when there is none, with an optional green "online" dot. */
export function Avatar({
  name,
  url,
  size = 40,
  online,
}: {
  name: string;
  url?: string | null;
  size?: number;
  online?: boolean;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" width={size} height={size} />
      ) : (
        <span aria-hidden="true">{initials || "?"}</span>
      )}
      {online !== undefined && <i className={online ? "dot on" : "dot"} aria-hidden="true" />}
    </span>
  );
}
