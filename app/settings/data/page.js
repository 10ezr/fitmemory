"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Database,
  Download,
  Upload,
  Trash2,
  FileText,
  Shield,
  RefreshCw,
  AlertTriangle
} from "lucide-react";

const DataSection = ({ title, description, children, icon: Icon }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        {title}
      </CardTitle>
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardHeader>
    <CardContent className="space-y-4">
      {children}
    </CardContent>
  </Card>
);

export default function DataManagementPage() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadDataStats();
  }, []);

  const loadDataStats = async () => {
    try {
      const res = await fetch("/api/data/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.warn("Failed to load data stats:", e);
    }
  };

  const exportData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/data/export", { method: "POST" });
      if (!res.ok) throw new Error("Export failed");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fitmemory-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("Data exported successfully");
    } catch (e) {
      toast.error("Failed to export data");
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = async () => {
    if (!confirm(
      "Are you sure you want to delete ALL your FitMemory data? This action cannot be undone. This will delete workouts, messages, memories, and all settings."
    )) return;
    
    if (!confirm(
      "This is your final warning. ALL DATA WILL BE PERMANENTLY DELETED. Are you absolutely sure?"
    )) return;

    setLoading(true);
    try {
      const res = await fetch("/api/data/clear-all", { method: "DELETE" });
      if (!res.ok) throw new Error("Clear failed");
      
      toast.success("All data cleared successfully");
      await loadDataStats();
    } catch (e) {
      toast.error("Failed to clear data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold tracking-tight">
            Data Management
          </h1>
          <p className="text-muted-foreground">
            Export, import, backup and manage your FitMemory data
          </p>
        </motion.div>

        {/* Data Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Messages</span>
                </div>
                <p className="text-2xl font-bold">{stats?.messages || 0}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Workouts</span>
                </div>
                <p className="text-2xl font-bold">{stats?.workouts || 0}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Memories</span>
                </div>
                <p className="text-2xl font-bold">{stats?.memories || 0}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Last Export</span>
                </div>
                <p className="text-sm text-muted-foreground">Never</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Export Data */}
          <DataSection
            title="Export Data"
            description="Download all your FitMemory data in JSON format for backup or migration"
            icon={Download}
          >
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-muted/20">
                <h4 className="font-medium mb-2">Export includes:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• All workout sessions and exercises</li>
                  <li>• Chat messages and AI conversations</li>
                  <li>• Long-term memories and preferences</li>
                  <li>• Streak data and statistics</li>
                  <li>• Sleep tracking data</li>
                </ul>
              </div>
              
              <Button 
                onClick={exportData} 
                disabled={loading}
                className="w-full flex items-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export All Data
              </Button>
            </div>
          </DataSection>

          {/* Import Data */}
          <DataSection
            title="Import Data"
            description="Import FitMemory data from a previously exported backup file"
            icon={Upload}
          >
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-orange-200 bg-orange-50">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <p className="font-medium mb-1">Import will merge with existing data</p>
                    <p>Duplicate entries may be created. Consider exporting your current data first.</p>
                  </div>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                disabled
                className="w-full flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Import Data (Coming Soon)
              </Button>
            </div>
          </DataSection>
        </div>

        {/* Danger Zone */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Irreversible actions that will permanently delete your data
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-destructive">Clear All Data</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    This will permanently delete all your workouts, messages, memories, streak data, 
                    and settings. This action cannot be undone.
                  </p>
                </div>
                
                <Button 
                  variant="destructive" 
                  onClick={clearAllData}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete All Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}