"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, Settings, Activity, Moon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function BottomNav() {
  const pathname = usePathname();
  
  const NavItem = ({ href, active, children, badge, label }) => (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-lg transition-all duration-200 relative min-w-0 ${
        active 
          ? "text-primary bg-primary/10 shadow-sm scale-105" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:scale-105"
      }`}
    >
      <div className="relative">
        {children}
        {badge && (
          <Badge variant="secondary" className="absolute -top-1.5 -right-1.5 h-3 w-3 p-0 text-[8px] rounded-full flex items-center justify-center">
            {badge}
          </Badge>
        )}
      </div>
      <span className={`text-[10px] font-medium truncate max-w-[60px] ${
        active ? "text-primary" : "text-muted-foreground"
      }`}>
        {label}
      </span>
    </Link>
  );

  return (
    <>
      {/* Bottom spacing to prevent content from being hidden behind nav */}
      <div className="h-16" />
      
      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 shadow-2xl">
        <div className="mx-auto max-w-md px-2 py-1.5">
          <div className="grid grid-cols-5 gap-1">
            <NavItem href="/" active={pathname === "/"} label="Chat">
              <Home className="h-4 w-4" />
            </NavItem>
            
            <NavItem href="/analytics" active={pathname?.startsWith("/analytics")} label="Analytics">
              <BarChart3 className="h-4 w-4" />
            </NavItem>
            
            <NavItem href="/workouts" active={pathname?.startsWith("/workouts")} label="Workouts">
              <Activity className="h-4 w-4" />
            </NavItem>
            
            <NavItem href="/admin" active={pathname?.startsWith("/admin")} label="Admin">
              <Settings className="h-4 w-4" />
            </NavItem>
            
            <NavItem href="/profile" active={pathname?.startsWith("/profile")} label="Profile">
              <div className="relative">
                <Avatar className="h-4 w-4 ring-1 ring-background">
                  <AvatarImage src="/icon-192x192.png" alt="Profile" className="object-cover" />
                  <AvatarFallback className="text-[8px] font-bold bg-gradient-to-br from-primary/30 to-primary/10 text-primary">
                    FM
                  </AvatarFallback>
                </Avatar>
              </div>
            </NavItem>
          </div>
        </div>
      </div>
    </>
  );
}