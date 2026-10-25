import { LibraryList } from "@/components/LibraryList";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: DICTIONARIES[await getLocale()].library.books };
}

export default async function BooksPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  return <LibraryList part="books" level={(await searchParams).level} />;
}
