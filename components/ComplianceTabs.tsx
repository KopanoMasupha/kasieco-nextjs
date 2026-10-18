"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const TABS = [
  { href: "/owner/compliance", label: "My status" },
  { href: "/owner/learn", label: "Free course" },
  { href: "/owner/training", label: "Government training" },
];

export default function ComplianceTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={clsx("chip", (t.href === "/owner/compliance" ? pathname === t.href : pathname.startsWith(t.href)) && "chip-active")}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
