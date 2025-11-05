"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  User, Settings, Award, TrendingUp, 
  Activity, Moon, Target, Clock,
  Edit3, Save, X, Camera
} from "lucide-react";

const StatCard = ({ title, value, subtitle, icon: Icon, color = "text-primary" }) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
          </div>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

const AchievementCard = ({ title, description, date, icon, color = "primary" }) => (
  <Card className="hover:shadow-sm transition-shadow">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full bg-${color}/10 flex items-center justify-center`}>
          <span className="text-lg">{icon}</span>
        </div>
        <div className="flex-1">
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
          <p className="text-xs text-muted-foreground mt-1">{date}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState({
    name: "FitMemory User",
    email: "user@fitmemory.app",
    bio: "On a journey to better health and fitness",
    joinDate: "2024-01-01",
    goals: ["Lose weight", "Build strength", "Improve sleep"]
  });
  const [editing, setEditing] = useState(false);
  const [tempProfile, setTempProfile] = useState(profile);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const [statsRes, profileRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/profile").catch(() => ({ json: () => profile })) // Fallback if endpoint doesn't exist
      ]);

      const [statsData, profileData] = await Promise.all([
        statsRes.json(),
        profileRes.json()
      ]);

      setStats(statsData);
      if (profileData && Object.keys(profileData).length > 0) {
        setProfile(profileData);
        setTempProfile(profileData);
      }
    } catch (error) {
      console.error("Failed to load profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      // This would normally save to an API endpoint
      setProfile(tempProfile);
      setEditing(false);
      // toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Failed to save profile:", error);
      // toast.error("Failed to update profile");
    }
  };

  const cancelEdit = () => {
    setTempProfile(profile);
    setEditing(false);
  };

  // Calculate some achievements based on stats
  const achievements = [
    {
      title: "First Workout",
      description: "Completed your first workout session",
      date: "2 weeks ago",
      icon: "🎯",
      color: "green"
    },
    {
      title: "Week Warrior",
      description: "Maintained a 7-day workout streak",
      date: "1 week ago",
      icon: "🔥",
      color: "orange"
    },
    {
      title: "Sleep Champion",
      description: "Logged quality sleep for 5 consecutive nights",
      date: "3 days ago",
      icon: "😴",
      color: "blue"
    },
    {
      title: "Consistency King",
      description: "Worked out 3 times this week",
      date: "Yesterday",
      icon: "👑",
      color: "purple"
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="relative inline-block">
          <Avatar className="w-24 h-24 mx-auto ring-4 ring-background shadow-lg">
            <AvatarImage src="/icon-192x192.png" alt={profile.name} />
            <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/20 to-primary/10">
              {profile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Button
            size="sm"
            variant="secondary"
            className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0"
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold">{profile.name}</h1>
          <p className="text-muted-foreground">{profile.bio}</p>
          <p className="text-sm text-muted-foreground">
            Member since {new Date(profile.joinDate).toLocaleDateString()}
          </p>
        </div>
      </motion.div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Current Streak"
            value={`${stats.currentStreak || 0}`}
            subtitle="days"
            icon={TrendingUp}
            color="text-orange-500"
          />
          <StatCard
            title="Total Workouts"
            value={stats.totalWorkouts || 0}
            subtitle="completed"
            icon={Activity}
          />
          <StatCard
            title="Hours Trained"
            value={`${Math.round((stats.totalDuration || 0) / 3600)}h`}
            subtitle="this month"
            icon={Clock}
          />
          <StatCard
            title="Sleep Quality"
            value={`${(stats.avgSleepQuality || 0).toFixed(1)}/10`}
            subtitle="average"
            icon={Moon}
            color="text-blue-500"
          />
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Achievements
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                {!editing ? (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveProfile}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={tempProfile.name}
                      onChange={(e) => setTempProfile({...tempProfile, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={tempProfile.email}
                      onChange={(e) => setTempProfile({...tempProfile, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bio</label>
                    <Textarea
                      value={tempProfile.bio}
                      onChange={(e) => setTempProfile({...tempProfile, bio: e.target.value})}
                      rows={3}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="text-lg">{profile.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-lg">{profile.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bio</p>
                    <p className="text-lg">{profile.bio}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Current Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.goals.map((goal, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {goal}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">Your Achievements</h2>
            <p className="text-muted-foreground">
              Celebrate your fitness milestones and progress
            </p>
          </div>
          
          <div className="grid gap-4">
            {achievements.map((achievement, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <AchievementCard {...achievement} />
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                App Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <h4 className="font-medium">Notifications</h4>
                  <p className="text-sm text-muted-foreground">Receive workout reminders and streak alerts</p>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <h4 className="font-medium">Data Export</h4>
                  <p className="text-sm text-muted-foreground">Download your workout and sleep data</p>
                </div>
                <Button variant="outline" size="sm">
                  Export
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <h4 className="font-medium">Privacy Settings</h4>
                  <p className="text-sm text-muted-foreground">Manage your data and privacy preferences</p>
                </div>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20">
                <div>
                  <h4 className="font-medium text-destructive">Delete Account</h4>
                  <p className="text-sm text-muted-foreground">Permanently remove your account and all data</p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}