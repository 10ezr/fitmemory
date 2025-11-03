"use client";

import { usePathname } from "next/navigation";
import NavigationHub from "@/components/NavigationHub";

/**
 * AppLayout component that provides consistent layout and fixes scrolling issues
 * across all pages except homepage (which has its own layout)
 */
export default function AppLayout({ children }) {
  const pathname = usePathname();
  
  // Homepage has its own layout with sidebars
  const isHomePage = pathname === "/";
  const isLoginPage = pathname?.startsWith("/login");
  
  // Skip layout wrapper for homepage and login
  if (isHomePage || isLoginPage) {
    return children;
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Fixed height container with proper scrolling */}
      <div className="h-screen overflow-hidden">
        <div className="h-full overflow-y-auto scrollbar-hide">
          {/* Main content with proper padding */}
          <main className="w-full max-w-7xl mx-auto px-4 py-6">
            {children}
          </main>
          
          {/* Extra padding at bottom to prevent content being hidden behind nav */}
          <div className="h-20" />
        </div>
      </div>
      
      {/* Navigation hub for all pages except homepage */}
      <NavigationHub />
    </div>
  );
}