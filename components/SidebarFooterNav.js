"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Home, BarChart3, Activity, Settings, User, 
  Moon, Database, ShieldCheck, Wrench
} from "lucide-react";

export default function SidebarFooterNav({ isCollapsed = false }) {
  const pathname = usePathname();

  const Item = ({ href, label, icon: Icon, className = "" }) => {
    const active = href === "/" ? pathname === "/" : pathname?.startsWith(href);
    return (
      <Link href={href} className="w-full">
        <Button 
          variant={active ? "secondary" : "ghost"} 
          className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'} gap-2 ${className}`}
          size={isCollapsed ? "sm" : "default"}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span className="text-sm truncate">{label}</span>}
        </Button>
      </Link>
    );
  };

  if (isCollapsed) {
    return (
      <div className="space-y-1">
        <Item href="/" label="Chat" icon={Home} />
        <Item href="/workouts" label="Workouts" icon={Activity} />
        <Item href="/analytics" label="Analytics" icon={BarChart3} />
        <Item href="/profile" label="Profile" icon={User} />
        <Item href="/settings" label="Settings" icon={Settings} />
        <Item href="/admin" label="Admin" icon={ShieldCheck} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Item href="/" label="Chat" icon={Home} />
        <Item href="/workouts" label="Workouts" icon={Activity} />
        <Item href="/analytics" label="Analytics" icon={BarChart3} />
        <Item href="/profile" label="Profile" icon={User} />
      </div>
      
      <Separator className="my-2" />
      
      <div className="space-y-1">
        <Item href="/settings" label="Settings" icon={Settings} />
        <Item href="/data" label="Data" icon={Database} />
        <Item href="/admin" label="Admin" icon={ShieldCheck} />
      </div>
      
      <Separator className="my-3" />
      
      <div className="px-2 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src="/icon-192x192.png" alt="FitMemory" />
              <AvatarFallback className="text-xs bg-gradient-to-br from-primary/30 to-primary/10 text-primary">
                FM
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-muted-foreground">FitMemory</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            v1.0
          </Badge>
        </div>
      </div>
    </div>
  );
}
