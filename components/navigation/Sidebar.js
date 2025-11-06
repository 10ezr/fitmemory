"use client";

import { useState } from "react";
import Link from "next/link";
import { SidebarFooterNav } from "@/components/SidebarFooterNav";
import { cn } from "@/lib/utils";

// Unified navigation sidebar; merges FitnessSidebar and LeftSidebar
export default function Sidebar({ className = "" }) {
  const [collapsed, setCollapsed] = useState(false);

  const items = [
    { href: "/", label: "Home" },
    { href: "/workouts", label: "Workouts" },
    { href: "/analytics", label: "Analytics" },
    { href: "/sleep", label: "Sleep" },
    { href: "/profile", label: "Profile" },
  ];

  const adminItems = [
    { href: "/settings", label: "Settings" },
    { href: "/admin/backup", label: "Backup & Export" },
    { href: "/admin/logs", label: "Logs" },
  ];

  return (
    <aside className={cn("h-full border-r bg-background/60", className)}>
      <div className="flex items-center justify-between px-3 h-12 border-b">
        <Link href="/" className="font-semibold tracking-tight">FitMemory</Link>
        <button className="text-xs text-muted-foreground" onClick={()=>setCollapsed(v=>!v)}>{collapsed?"▶":"◀"}</button>
      </div>
      <nav className="p-2 space-y-1">
        {items.map(it => (
          <Link key={it.href} href={it.href} className="block px-3 py-2 rounded hover:bg-muted text-sm">
            {it.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto">
        <SidebarFooterNav items={adminItems} />
      </div>
    </aside>
  );
}
