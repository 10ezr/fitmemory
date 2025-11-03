"use client"

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChartBarIcon } from "@heroicons/react/24/solid";

export default function HomeTopLinks({ onOpenAnalytics }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) return null;

  return (
    <div className="flex items-center justify-between mb-2">
      <div className="text-sm text-muted-foreground">Your unified health hub</div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20"
          onClick={onOpenAnalytics}
          title="Open Analytics"
        >
          <ChartBarIcon className="w-4 h-4 mr-1.5" />
          Analytics
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("openAdminPanel", { detail: { source: "home-cta" } }));
          }}
          title="Open Admin"
        >
          Settings
        </Button>
      </div>
    </div>
  );
}
