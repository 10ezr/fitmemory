import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dumbbell,
  Activity,
  TrendingUp,
  Calendar,
  Target,
  BarChart3,
} from "lucide-react"

const quickMessages = [
  {
    text: "Did legs today - squats, deadlifts, lunges",
    label: "Log Leg Day",
    icon: Dumbbell,
    variant: "outline",
  },
  {
    text: "Upper body workout - bench, rows, pull-ups",
    label: "Log Upper Body",
    icon: Activity,
    variant: "outline",
  },
  {
    text: "Ran 5km in 25 minutes",
    label: "Log Cardio",
    icon: TrendingUp,
    variant: "outline",
  },
  {
    text: "Summarize my week",
    label: "Week Summary",
    icon: Calendar,
    variant: "secondary",
  },
  {
    text: "Create a workout plan for me",
    label: "Get Plan",
    icon: Target,
    variant: "default",
  },
  {
    text: "How am I doing with consistency?",
    label: "Check Progress",
    icon: BarChart3,
    variant: "secondary",
  },
]

export default function QuickActions({ onQuickMessage }) {
  return (
    <Card className="border-t rounded-t-none">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-2">
          {quickMessages.map((item, index) => {
            const IconComponent = item.icon
            return (
              <Button
                key={index}
                variant={item.variant}
                size="sm"
                onClick={() => onQuickMessage(item.text)}
                className="flex items-center gap-2 rounded-full transition-all duration-200 hover:scale-105"
              >
                <IconComponent className="h-3 w-3" />
                {item.label}
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}