"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  BarChart3,
  Settings,
  Activity,
  User,
  ChevronUp,
  Navigation,
  Compass,
  Sparkles
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

const navigationItems = [
  {
    href: "/",
    icon: Home,
    label: "Chat",
    description: "AI Fitness Coach",
    color: "text-blue-500",
    gradient: "from-blue-500/20 to-blue-600/20"
  },
  {
    href: "/analytics",
    icon: BarChart3,
    label: "Analytics",
    description: "Performance Insights",
    color: "text-purple-500",
    gradient: "from-purple-500/20 to-purple-600/20"
  },
  {
    href: "/workouts",
    icon: Activity,
    label: "Workouts",
    description: "Exercise Tracking",
    color: "text-green-500",
    gradient: "from-green-500/20 to-green-600/20"
  },
  {
    href: "/admin",
    icon: Settings,
    label: "Admin",
    description: "System Settings",
    color: "text-orange-500",
    gradient: "from-orange-500/20 to-orange-600/20"
  },
  {
    href: "/profile",
    icon: User,
    label: "Profile",
    description: "Personal Info",
    color: "text-pink-500",
    gradient: "from-pink-500/20 to-pink-600/20"
  }
];

const NavItem = ({ item, active, onNavigate }) => {
  const Icon = item.icon;
  
  return (
    <motion.div
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        href={item.href}
        onClick={onNavigate}
        className={`group flex items-center gap-4 p-4 rounded-xl transition-all duration-300 relative overflow-hidden ${
          active
            ? `bg-gradient-to-r ${item.gradient} border border-primary/20 shadow-lg`
            : "hover:bg-muted/50 border border-transparent"
        }`}
      >
        {/* Background gradient effect */}
        <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
        
        {/* Content */}
        <div className="relative z-10 flex items-center gap-4 w-full">
          <div className={`p-2 rounded-lg bg-background/80 backdrop-blur-sm border ${
            active ? "border-primary/20" : "border-muted/20"
          }`}>
            <Icon className={`h-4 w-4 ${active ? item.color : "text-muted-foreground group-hover:" + item.color}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className={`font-medium text-sm ${
              active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
            }`}>
              {item.label}
            </div>
            <div className="text-xs text-muted-foreground/70 truncate">
              {item.description}
            </div>
          </div>
          
          {active && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="h-2 w-2 rounded-full bg-primary"
            />
          )}
        </div>
      </Link>
    </motion.div>
  );
};

export default function NavigationHub() {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const pathname = usePathname();

  // Load basic stats for the hub
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch("/api/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.warn("Failed to load stats for navigation:", error);
      }
    };
    loadStats();
  }, []);

  const handleNavigate = () => {
    setIsOpen(false);
  };

  const currentPage = navigationItems.find(item => {
    if (item.href === "/") return pathname === "/";
    return pathname?.startsWith(item.href);
  });

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Button
              className="h-14 w-14 rounded-full bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-2xl border border-primary/20 backdrop-blur-sm group relative overflow-hidden"
              size="icon"
            >
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 group-hover:from-white/20 group-hover:to-white/10 transition-all duration-300" />
              
              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                  {isOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -180, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      exit={{ rotate: 180, scale: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronUp className="h-5 w-5 text-white" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="open"
                      initial={{ rotate: 180, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      exit={{ rotate: -180, scale: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Compass className="h-5 w-5 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Pulse effect */}
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/30"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.2, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </Button>
          </motion.div>
        </PopoverTrigger>
        
        <PopoverContent
          side="top"
          align="start"
          sideOffset={12}
          className="w-80 p-0 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl overflow-hidden"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="h-5 w-5 text-primary" />
                </motion.div>
                <h3 className="font-semibold text-lg">Navigation Hub</h3>
              </div>
              
              {/* Current page indicator */}
              {currentPage && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <currentPage.icon className={`h-4 w-4 ${currentPage.color}`} />
                  <span>Currently on {currentPage.label}</span>
                </div>
              )}
              
              {/* Quick stats */}
              {stats && (
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                    <span>{stats.dailyStreak || 0} day streak</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>{stats.totalWorkouts || 0} workouts</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Navigation items */}
            <div className="p-4 space-y-2">
              {navigationItems.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
                return (
                  <NavItem
                    key={item.href}
                    item={item}
                    active={isActive}
                    onNavigate={handleNavigate}
                  />
                );
              })}
            </div>
            
            {/* Footer */}
            <div className="p-4 pt-2 border-t border-border/50 bg-muted/20">
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
          </motion.div>
        </PopoverContent>
      </Popover>
    </div>
  );
}