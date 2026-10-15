"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { href: "/setup", label: "Location" },
  { href: "/farm", label: "Farm profile" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/assistant", label: "Assistant" },
] as const;

export default function AppNavigation() {
  const pathname = usePathname();

  return (
    <header className="border-b border-emerald-100 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          className="flex min-h-11 items-center gap-2 rounded-lg font-bold text-emerald-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          href="/"
        >
          <span aria-hidden="true" className="text-xl">✳</span>
          <span>Smart Agriculture Advisor</span>
        </Link>
        <nav
          aria-label="Main navigation"
          className="flex max-w-full flex-wrap gap-1"
        >
          {sections.map((section) => {
            const current = pathname === section.href;
            return (
              <Link
                aria-current={current ? "page" : undefined}
                className={`min-h-11 rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:px-4 ${
                  current
                    ? "bg-emerald-50 text-emerald-900"
                    : "text-stone-700 hover:bg-stone-50"
                }`}
                href={section.href}
                key={section.href}
              >
                {section.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
