import { headers } from "next/headers";

/** The site's host name for links printed on certificates, e.g. "speakly-jet.vercel.app". */
export async function siteHost() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return (await headers()).get("host") ?? "";
}
