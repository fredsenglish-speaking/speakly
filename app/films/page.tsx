import { LibraryList } from "@/components/LibraryList";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: DICTIONARIES[await getLocale()].library.films };
}

export default async function FilmsPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  return <LibraryList part="films" level={(await searchParams).level} />;
}
