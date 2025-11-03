"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, Settings, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function BottomNav() {
  const pathname = usePathname();
  const Item = ({ href, active, children }) => (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors ${
        active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
      }`}
    >
      {children}
    </Link>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-5xl px-3 py-2 grid grid-cols-4 gap-1">
        <Item href="/" active={pathname === "/"}>
          <Home className="h-5 w-5" />
          <span className="text-[11px]">Home</span>
        </Item>
        <Item href="/analytics" active={pathname?.startsWith("/analytics")}> 
          <BarChart3 className="h-5 w-5" />
          <span className="text-[11px]">Analytics</span>
        </Item>
        <Item href="/admin" active={pathname?.startsWith("/admin")}>
          <Settings className="h-5 w-5" />
          <span className="text-[11px]">Admin</span>
        </Item>
        <Item href="/profile" active={pathname?.startsWith("/profile")}>
          <Avatar className="h-5 w-5">
            <AvatarImage src="/icon-192x192.png" alt="Me" />
            <AvatarFallback>FM</AvatarFallback>
          </Avatar>
          <span className="text-[11px]">Me</span>
        </Item>
      </div>
    </div>
  );
}
