"use client";

import { useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArchiveBoxIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

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

  const exportData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/export");
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fitmemory-export-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showNotification("Data exported successfully", "success");
    } catch (error) {
      console.error("Export failed:", error);
      showNotification("Export failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const importData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Import failed");
      }

      showNotification(
        `Import completed: ${result.imported} records imported, ${result.skipped} skipped`,
        "success"
      );

      if (onDataChange) {
        await onDataChange();
      }
    } catch (error) {
      console.error("Import failed:", error);
      showNotification("Import failed: " + error.message, "error");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const createBackup = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/backup", { method: "POST" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Backup failed");
      }

      showNotification(
        `Backup created: ${result.totalRecords} records`,
        "success"
      );
    } catch (error) {
      console.error("Backup failed:", error);
      showNotification("Backup failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const clearMemory = async () => {
    if (
      !confirm(
        "Are you sure you want to clear all long-term memories? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/clear-memory", { method: "POST" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Clear memory failed");
      }

      showNotification(
        `Memory cleared: ${result.deletedCount} memories deleted`,
        "success"
      );
    } catch (error) {
      console.error("Clear memory failed:", error);
      showNotification("Clear memory failed", "error");
    } finally {
      setLoading(false);
    }
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
    <div className="mt-auto border-t p-4">
      <h3 className="text-lg font-semibold mb-4">Admin</h3>

      <div className="space-y-2">
        <button
          onClick={exportData}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          Export Data
        </button>

        <div className="relative">
          <input
            type="file"
            id="importFile"
            accept=".json"
            onChange={importData}
            className="hidden"
            disabled={loading}
          />
          <button
            onClick={() => document.getElementById("importFile")?.click()}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            Import Data
          </button>
        </div>

        <button
          onClick={createBackup}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
        >
          <ArchiveBoxIcon className="w-4 h-4" />
          Create Backup
        </button>

        <button
          onClick={clearMemory}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-destructive text-destructive-foreground px-3 py-2 text-sm font-medium hover:bg-destructive/90 disabled:opacity-50"
        >
          <TrashIcon className="w-4 h-4" />
          Clear Memory
        </button>

        <div className="border-t pt-2 mt-4">
          <button
            onClick={clearAllData}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-red-800 text-white px-3 py-2 text-sm font-bold hover:bg-red-900 disabled:opacity-50 border-2 border-red-600"
          >
            <TrashIcon className="w-4 h-4" />
            🚨 CLEAR ALL DATA 🚨
          </button>
          <p className="text-xs text-red-600 mt-1 text-center">
            Nuclear option - deletes everything!
          </p>
        </div>
      </div>

      {loading && (
        <div className="mt-3 text-center text-sm text-muted-foreground">
          Processing...
        </div>
      )}
    </div>
  );
}
