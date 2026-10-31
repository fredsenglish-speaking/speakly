"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The main menu; the section you are in is underlined in gold. */
export function NavLinks({ links }: { links: [string, string][] }) {
  const path = usePathname();
  return (
    <nav className="nav">
      {links.map(([href, label]) => {
        const active = path === href || path.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
