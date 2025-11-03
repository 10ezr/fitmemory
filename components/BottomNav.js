"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, Settings, User, Activity, Moon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function BottomNav() {
  const pathname = usePathname();
  
  const NavItem = ({ href, active, children, badge }) => (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 relative ${
        active ? "text-primary bg-primary/10 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
      }`}
    >
      {children}
      {badge && (
        <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[9px] rounded-full">
          {badge}
        </Badge>
      )}
    </Link>
  );

  return (
    <>
      {/* Bottom spacing to prevent content from being hidden behind nav */}
      <div className="h-20" />
      
      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-lg">
        <div className="mx-auto max-w-5xl px-3 py-2">
          <div className="grid grid-cols-5 gap-1">
            <NavItem href="/" active={pathname === "/"}>
              <Home className="h-5 w-5" />
              <span className="text-[11px] font-medium">Chat</span>
            </NavItem>
            
            <NavItem href="/analytics" active={pathname?.startsWith("/analytics")}>
              <BarChart3 className="h-5 w-5" />
              <span className="text-[11px] font-medium">Analytics</span>
            </NavItem>
            
            <NavItem href="/workouts" active={pathname?.startsWith("/workouts")}>
              <Activity className="h-5 w-5" />
              <span className="text-[11px] font-medium">Workouts</span>
            </NavItem>
            
            <NavItem href="/admin" active={pathname?.startsWith("/admin")}>
              <Settings className="h-5 w-5" />
              <span className="text-[11px] font-medium">Admin</span>
            </NavItem>
            
            <NavItem href="/profile" active={pathname?.startsWith("/profile")}>
              <div className="relative">
                <Avatar className="h-5 w-5 ring-2 ring-background">
                  <AvatarImage src="/icon-192x192.png" alt="Profile" />
                  <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-primary/20 to-primary/10">
                    FM
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-[11px] font-medium">Profile</span>
            </NavItem>
          </div>
        </div>
      </div>
    </>
  );
}