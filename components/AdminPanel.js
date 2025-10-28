"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminPanel() {
  const [loading, setLoading] = useState(false);

  const showNotification = (message, type = "info") => {
    toast(message, {
      duration: 3000,
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

      try {
        localStorage.clear();
        console.log("Local storage cleared");
      } catch (error) {
        console.log("Could not clear localStorage:", error);
      }

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
    <div className="p-4">
      <Button
        onClick={clearAllData}
        disabled={loading}
        variant="destructive"
        className="w-full"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "🚨 CLEAR ALL DATA 🚨"
        )}
      </Button>
    </div>
  );
}
