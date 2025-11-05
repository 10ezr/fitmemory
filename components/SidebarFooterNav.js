"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Home, BarChart3, Activity, Settings, User } from "lucide-react";

export default function SidebarFooterNav() {
  const pathname = usePathname();

  const Item = ({ href, label, icon: Icon }) => {
    const active = href === "/" ? pathname === "/" : pathname?.startsWith(href);
    return (
      <Link href={href} className="w-full">
        <Button variant={active ? "secondary" : "ghost"} className="w-full justify-start gap-2">
          <Icon className="h-4 w-4" />
          <span className="text-sm">{label}</span>
        </Button>
      </Link>
    );
  };

  return (
    <div className="grid gap-2">
      <Item href="/" label="Chat" icon={Home} />
      <Item href="/analytics" label="Analytics" icon={BarChart3} />
      <Item href="/workouts" label="Workouts" icon={Activity} />
      <Item href="/admin" label="Admin" icon={Settings} />
      <Item href="/profile" label="Profile" icon={User} />
    </div>
  );
}
