"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Home, BarChart3, Activity, Settings, User, 
  ChevronDown, ChevronRight, Moon, Bell, 
  Zap, Database, Shield
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function SidebarFooterNav() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const settingsItems = [
    { href: "/settings/sleep", label: "Sleep Goals", icon: Moon },
    { href: "/settings/notifications", label: "Notifications", icon: Bell },
    { href: "/settings/ai", label: "AI & Memory", icon: Zap },
    { href: "/settings/data", label: "Data Management", icon: Database },
    { href: "/settings/security", label: "Security", icon: Shield },
  ];

  const hasActiveSettings = settingsItems.some(item => pathname?.startsWith(item.href));

  return (
    <div className="space-y-2">
      {/* Main navigation items */}
      <Item href="/" label="Chat" icon={Home} />
      <Item href="/analytics" label="Analytics" icon={BarChart3} />
      <Item href="/workouts" label="Workouts" icon={Activity} />
      <Item href="/profile" label="Profile" icon={User} />
      
      <Separator className="my-2" />
      
      {/* Settings collapsible section */}
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant={hasActiveSettings ? "secondary" : "ghost"} 
            className="w-full justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm">Settings</span>
            </div>
            {settingsOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pl-2 mt-1">
          {settingsItems.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className="w-full">
                <Button 
                  variant={active ? "secondary" : "ghost"} 
                  size="sm"
                  className="w-full justify-start gap-2 text-xs font-normal"
                >
                  <item.icon className="h-3 w-3" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </CollapsibleContent>
      </Collapsible>

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