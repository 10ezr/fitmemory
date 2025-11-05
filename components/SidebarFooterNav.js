"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Home, BarChart3, Activity, Settings, User
} from "lucide-react";

export default function SidebarFooterNav() {
  const pathname = usePathname();

  const Item = ({ href, label, icon: Icon, className = "" }) => {
    const active = href === "/" ? pathname === "/" : pathname?.startsWith(href);
    return (
      <Link href={href} className="w-full">
        <Button 
          variant={active ? "secondary" : "ghost"} 
          className={`w-full justify-start gap-2 ${className}`}
        >
          <Icon className="h-4 w-4" />
          <span className="text-sm">{label}</span>
        </Button>
      </Link>
    );
  };

  return (
    <div className="space-y-2">
      {/* Main navigation items */}
      <Item href="/" label="Chat" icon={Home} />
      <Item href="/analytics" label="Analytics" icon={BarChart3} />
      <Item href="/workouts" label="Workouts" icon={Activity} />
      <Item href="/profile" label="Profile" icon={User} />
      <Item href="/admin" label="Admin" icon={Settings} />
      
      <Separator className="my-3" />
      
      {/* App info footer */}
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