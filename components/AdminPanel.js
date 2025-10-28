"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";

export default function AdminPanel({ onDataChange }) {
  const [loading, setLoading] = useState(false);

  const showNotification = (message, type = "info") => {
    // Simple notification - you could use a proper toast library
    const notification = document.createElement("div");
    notification.className = `fixed top-4 right-4 px-4 py-3 rounded-lg text-white font-medium z-50 ${
      type === "success"
        ? "bg-green-600"
        : type === "error"
        ? "bg-red-600"
        : "bg-blue-600"
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => document.body.removeChild(notification), 3000);
  };

  const clearAllData = async () => {
    const confirmMessage = `⚠️ DANGER ZONE ⚠️

This will PERMANENTLY DELETE ALL DATA:
• All workouts and exercises
• All conversation history  
• All memories and patterns
• All streak data
• All user settings
• All notification settings
• Everything in the database
• All local storage data

This action CANNOT be undone!

Type "DELETE ALL" to confirm:`;

    const userInput = prompt(confirmMessage);

    if (userInput !== "DELETE ALL") {
      showNotification("Operation cancelled", "info");
      return;
    }

    // Double confirmation
    if (
      !confirm(
        "FINAL WARNING: This will delete EVERYTHING and reset the app to a completely fresh state. Are you absolutely sure?"
      )
    ) {
      return;
    }

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
              className="w-full justify-start bg-red-600 hover:bg-red-700 border-2 border-red-500"
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
  );
}
