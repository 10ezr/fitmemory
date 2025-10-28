"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export default function AdminPanel({ onDataChange }) {
  const [loading, setLoading] = useState(false);

  const showNotification = (message, type = "info") => {
    toast(message, {
      description:
        type === "success"
          ? undefined
          : type === "error"
          ? undefined
          : undefined,
      // If you want to show title/description pattern, you could adapt sonner props, but basic 'toast' just takes message (optionally options)
      // Variants for sonner are set via 'type'
      // See: https://sonner.emilkowal.ski/toast
      // We'll provide the variant via 'type' for color
      // Note: for 'sonner', 'type' prop becomes the style
      // We'll use 'success' and 'error' which are valid types
      duration: 3000,
      // For sonner v2+, you can use 'variant'/'type' or custom classes.
      // We'll use 'type' here as it's a documented prop.
      // (for v2+; remove if using older sonner version)
      // type: type === "success" ? "success" : type === "error" ? "error" : "default"
      // 'type' prop works for v2+ - if not, just use default color.
      type:
        type === "success" ? "success" : type === "error" ? "error" : "default",
    });
  };

  const clearAllData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/clear-all-data", { method: "POST" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Clear all data failed");
      }

      showNotification(
        `All data cleared: ${result.totalDeleted} records deleted. Clearing local storage...`,
        "success"
      );

      // Clear localStorage as well
      try {
        localStorage.clear();
        console.log("Local storage cleared");
      } catch (error) {
        console.log("Could not clear localStorage:", error);
      }

      // Refresh the page after a short delay to show the fresh state
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Clear all data failed:", error);
      showNotification("Clear all data failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster />
      <Card className="mt-auto">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Database Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Danger Zone */}
            <div className="space-y-2 border border-destructive/20 rounded-lg p-3 bg-destructive/5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  Danger Zone
                </span>
              </div>

              <Button
                onClick={clearAllData}
                disabled={loading}
                variant="destructive"
                className="w-full justify-start"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                🚨 CLEAR ALL DATA 🚨
              </Button>

              <p className="text-xs text-destructive/80 text-center">
                Nuclear option - deletes everything from the database!
              </p>
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Processing...
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
