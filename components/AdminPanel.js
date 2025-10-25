"use client"

import { useState } from "react"
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArchiveBoxIcon,
  TrashIcon,
} from "@heroicons/react/24/outline"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  Download,
  Upload,
  Archive,
  Trash2,
  Loader2,
} from "lucide-react"

export default function AdminPanel({ onDataChange }) {
  const [loading, setLoading] = useState(false)

  const showNotification = (message, type = "info") => {
    // Simple notification - you could use a proper toast library
    const notification = document.createElement("div")
    notification.className = `fixed top-4 right-4 px-4 py-3 rounded-lg text-white font-medium z-50 ${
      type === "success"
        ? "bg-green-600"
        : type === "error"
        ? "bg-red-600"
        : "bg-blue-600"
    }`
    notification.textContent = message
    document.body.appendChild(notification)
    setTimeout(() => document.body.removeChild(notification), 3000)
  }

  const exportData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/export")
      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `fitmemory-export-${
        new Date().toISOString().split("T")[0]
      }.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showNotification("Data exported successfully", "success")
    } catch (error) {
      console.error("Export failed:", error)
      showNotification("Export failed", "error")
    } finally {
      setLoading(false)
    }
  }

  const importData = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      setLoading(true)
      const text = await file.text()
      const data = JSON.parse(text)

      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Import failed")
      }

      showNotification(
        `Import completed: ${result.imported} records imported, ${result.skipped} skipped`,
        "success"
      )

      if (onDataChange) {
        await onDataChange()
      }
    } catch (error) {
      console.error("Import failed:", error)
      showNotification("Import failed: " + error.message, "error")
    } finally {
      setLoading(false)
      event.target.value = ""
    }
  }

  const createBackup = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/backup", { method: "POST" })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Backup failed")
      }

      showNotification(
        `Backup created: ${result.totalRecords} records`,
        "success"
      )
    } catch (error) {
      console.error("Backup failed:", error)
      showNotification("Backup failed", "error")
    } finally {
      setLoading(false)
    }
  }

  const clearMemory = async () => {
    if (
      !confirm(
        "Are you sure you want to clear all long-term memories? This cannot be undone."
      )
    ) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch("/api/clear-memory", { method: "POST" })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Clear memory failed")
      }

      showNotification(
        `Memory cleared: ${result.deletedCount} memories deleted`,
        "success"
      )
    } catch (error) {
      console.error("Clear memory failed:", error)
      showNotification("Clear memory failed", "error")
    } finally {
      setLoading(false)
    }
  }

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

Type "DELETE ALL" to confirm:`

    const userInput = prompt(confirmMessage)

    if (userInput !== "DELETE ALL") {
      showNotification("Operation cancelled", "info")
      return
    }

    // Double confirmation
    if (
      !confirm(
        "FINAL WARNING: This will delete EVERYTHING and reset the app to a completely fresh state. Are you absolutely sure?"
      )
    ) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch("/api/clear-all-data", { method: "POST" })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Clear all data failed")
      }

      showNotification(
        `All data cleared: ${result.totalDeleted} records deleted. Clearing local storage...`,
        "success"
      )

      // Clear localStorage as well
      try {
        localStorage.clear()
        console.log("Local storage cleared")
      } catch (error) {
        console.log("Could not clear localStorage:", error)
      }

      // Refresh the page after a short delay to show the fresh state
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error("Clear all data failed:", error)
      showNotification("Clear all data failed: " + error.message, "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mt-auto">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Admin Panel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Data Management */}
          <div className="space-y-2">
            <Button
              onClick={exportData}
              disabled={loading}
              variant="outline"
              className="w-full justify-start"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>

            <div className="relative">
              <input
                type="file"
                id="importFile"
                accept=".json"
                onChange={importData}
                className="hidden"
                disabled={loading}
              />
              <Button
                onClick={() => document.getElementById("importFile")?.click()}
                disabled={loading}
                variant="outline"
                className="w-full justify-start"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import Data
              </Button>
            </div>

            <Button
              onClick={createBackup}
              disabled={loading}
              variant="outline"
              className="w-full justify-start"
            >
              <Archive className="mr-2 h-4 w-4" />
              Create Backup
            </Button>
          </div>

          <Separator />

          {/* Maintenance Actions */}
          <div className="space-y-2">
            <Button
              onClick={clearMemory}
              disabled={loading}
              variant="destructive"
              className="w-full justify-start"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Memory
            </Button>
          </div>

          <Separator />

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
              Nuclear option - deletes everything!
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
  )
}