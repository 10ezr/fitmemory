"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import LeftSidebar from "@/components/LeftSidebar";
import { useState, useEffect } from "react";

/**
 * AppLayout component that provides consistent layout with left sidebar
 * across all pages except homepage (which has its own layout)
 */
export default function AppLayout({ children }) {
  const pathname = usePathname();
  const [stats, setStats] = useState(null);
  
  // Homepage has its own layout with sidebars
  const isHomePage = pathname === "/";
  const isLoginPage = pathname?.startsWith("/login");
  
  // Skip layout wrapper for homepage and login
  if (isHomePage || isLoginPage) {
    return children;
  }

  // Load stats for sidebar
  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (res.ok) {
          const statsData = await res.json();
          setStats(statsData);
        }
      } catch (error) {
        console.warn('Failed to load stats for sidebar:', error);
      }
    };
    
    loadStats();
  }, []);

  const refreshStats = async () => {
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      if (res.ok) {
        const fresh = await res.json();
        setStats(fresh);
      }
    } catch (error) {
      console.warn('Stats refresh failed:', error);
    }
  };
  
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <LeftSidebar 
          stats={stats} 
          onDataChange={refreshStats}
          showFullStats={false} // Don't show all stats on non-home pages
        />
        <SidebarInset className="flex-1">
          <div className="h-full overflow-y-auto scrollbar-hide">
            {/* Main content with proper padding */}
            <main className="w-full max-w-7xl mx-auto px-4 py-6">
              {children}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}