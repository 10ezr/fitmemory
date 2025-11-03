"use client";

import { useState, useEffect } from "react";
import { Clock, Moon, Dumbbell, Brain, Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const DEFAULT_SHORTCUTS = [
  { text: "Log last night's sleep", icon: Moon, category: "sleep", usage: 0 },
  {
    text: "Log today's workout",
    icon: Dumbbell,
    category: "fitness",
    usage: 0,
  },
  {
    text: "Check my readiness score",
    icon: Heart,
    category: "health",
    usage: 0,
  },
  {
    text: "How did I sleep this week?",
    icon: Brain,
    category: "sleep",
    usage: 0,
  },
  { text: "Show my progress", icon: Brain, category: "fitness", usage: 0 },
  { text: "Create a workout plan", icon: Plus, category: "fitness", usage: 0 },
];

const CONTEXTUAL_SHORTCUTS = {
  morning: [
    { text: "Good morning! How did I sleep?", icon: Moon, category: "sleep" },
    {
      text: "What's my readiness score today?",
      icon: Heart,
      category: "health",
    },
    { text: "Plan today's workout", icon: Dumbbell, category: "fitness" },
  ],
  evening: [
    { text: "Log today's workout", icon: Dumbbell, category: "fitness" },
    { text: "Set bedtime reminder", icon: Clock, category: "sleep" },
    { text: "How was my day?", icon: Brain, category: "health" },
  ],
  night: [
    { text: "Going to bed soon", icon: Moon, category: "sleep" },
    { text: "Log today's activities", icon: Brain, category: "health" },
    { text: "Set wake up time", icon: Clock, category: "sleep" },
  ],
};

export default function QuickShortcuts({ onSelectShortcut, className }) {
  const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);
  const [contextualShortcuts, setContextualShortcuts] = useState([]);

  useEffect(() => {
    loadShortcuts();
    updateContextualShortcuts();
  }, []);

  const loadShortcuts = () => {
    try {
      const saved = localStorage.getItem("fitmemory_shortcuts");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults, preserving usage data
        const merged = DEFAULT_SHORTCUTS.map((def) => {
          const saved = parsed.find((p) => p.text === def.text);
          return saved ? { ...def, usage: saved.usage } : def;
        });
        // Add any new shortcuts from storage
        parsed.forEach((saved) => {
          if (!merged.find((m) => m.text === saved.text)) {
            merged.push(saved);
          }
        });
        setShortcuts(merged.sort((a, b) => b.usage - a.usage));
      }
    } catch (error) {
      console.error("Error loading shortcuts:", error);
    }
  };

  const updateContextualShortcuts = () => {
    const hour = new Date().getHours();
    let timeOfDay = "morning";

    if (hour >= 12 && hour < 18) timeOfDay = "afternoon";
    else if (hour >= 18 && hour < 22) timeOfDay = "evening";
    else if (hour >= 22 || hour < 6) timeOfDay = "night";

    const contextual =
      CONTEXTUAL_SHORTCUTS[timeOfDay] || CONTEXTUAL_SHORTCUTS.morning;
    setContextualShortcuts(contextual);
  };

  const saveShortcuts = (newShortcuts) => {
    try {
      localStorage.setItem("fitmemory_shortcuts", JSON.stringify(newShortcuts));
    } catch (error) {
      console.error("Error saving shortcuts:", error);
    }
  };

  const handleShortcutClick = (shortcut) => {
    // Update usage count
    const updatedShortcuts = shortcuts.map((s) =>
      s.text === shortcut.text ? { ...s, usage: s.usage + 1 } : s
    );

    // Resort by usage
    updatedShortcuts.sort((a, b) => b.usage - a.usage);

    setShortcuts(updatedShortcuts);
    saveShortcuts(updatedShortcuts);

    // Trigger the callback
    onSelectShortcut(shortcut.text);
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "sleep":
        return "from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border-blue-200/50 dark:border-blue-800/50";
      case "fitness":
        return "from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 border-green-200/50 dark:border-green-800/50";
      case "health":
        return "from-orange-50 to-red-50 dark:from-orange-950/50 dark:to-red-950/50 border-orange-200/50 dark:border-orange-800/50";
      default:
        return "from-gray-50 to-slate-50 dark:from-gray-950/50 dark:to-slate-950/50 border-gray-200/50 dark:border-gray-800/50";
    }
  };

  // Get top 6 shortcuts (3 most used + 3 contextual)
  const topShortcuts = shortcuts.slice(0, 3);
  const displayShortcuts = [...topShortcuts, ...contextualShortcuts.slice(0, 3)]
    .reduce((unique, shortcut) => {
      if (!unique.find((u) => u.text === shortcut.text)) {
        unique.push(shortcut);
      }
      return unique;
    }, [])
    .slice(0, 6);

  return (
    <div className={`space-y-3 ${className}`}>
      {displayShortcuts.length < 4 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {displayShortcuts.map((shortcut, index) => {
              const IconComponent = shortcut.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleShortcutClick(shortcut)}
                  className={`
                    rounded-full text-xs transition-all duration-200 
                    hover:scale-105 active:scale-95 
                    bg-gradient-to-br ${getCategoryColor(shortcut.category)}
                    hover:shadow-md border
                  `}
                >
                  <IconComponent className="h-3 w-3 mr-1.5" />
                  {shortcut.text}
                  {shortcut.usage > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1.5 text-xs px-1 py-0 h-4"
                    >
                      {shortcut.usage}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
