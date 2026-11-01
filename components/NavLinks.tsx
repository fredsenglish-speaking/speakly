"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * The main menu; the section you are in is underlined in gold.
 * On phones it folds into a ☰ button; `children` (languages, sign in / out) are shown inside it there.
 */
export function NavLinks({ links, menuLabel, children }: { links: [string, string][]; menuLabel: string; children?: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  return (
    <>
      <button
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="main-nav"
        aria-label={menuLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">{open ? "✕" : "☰"}</span>
      </button>
      <nav id="main-nav" className={open ? "nav open" : "nav"}>
        {links.map(([href, label]) => {
          const active = path === href || path.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}>
              {label}
            </Link>
          );
        })}
        {children && <div className="nav-extra">{children}</div>}
      </nav>
    </>
  );
}
