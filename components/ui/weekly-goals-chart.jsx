"use client"

import { RadialBarChart, RadialBar } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  workouts: {
    label: "Workouts",
    color: "hsl(var(--chart-1))",
  },
  goal: {
    label: "Goal",
    color: "hsl(var(--muted))",
  },
}

export function WeeklyGoalsChart({ 
  workoutsCompleted = 0, 
  weeklyGoal = 5, 
  className = "" 
}) {
  const percentage = Math.min((workoutsCompleted / weeklyGoal) * 100, 100)
  
  const chartData = [
    {
      name: "progress",
      workouts: workoutsCompleted,
      goal: weeklyGoal,
      fill: "var(--color-workouts)",
    },
  ]

  return (
    <Card className={className}>
      <CardHeader className="items-center pb-0">
        <CardTitle>Weekly Goal Progress</CardTitle>
        <CardDescription>
          {workoutsCompleted} of {weeklyGoal} workouts completed
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[200px]"
        >
          <RadialBarChart
            data={chartData}
            startAngle={90}
            endAngle={90 + (percentage * 3.6)}
            innerRadius={60}
            outerRadius={90}
          >
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent 
                  hideLabel 
                  formatter={(value, name) => [
                    `${value} ${name === 'workouts' ? 'completed' : 'goal'}`,
                    name === 'workouts' ? 'Workouts' : 'Goal'
                  ]}
                />
              }
            />
            <RadialBar
              dataKey="goal"
              fill="hsl(var(--muted))"
              stackId="a"
              cornerRadius={10}
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="workouts"
              fill="hsl(var(--primary))"
              stackId="a"
              cornerRadius={10}
              className="stroke-background stroke-2"
            />
          </RadialBarChart>
        </ChartContainer>
        <div className="flex flex-col items-center gap-2 text-sm">
          <div className="flex items-center gap-2 font-medium leading-none">
            {percentage.toFixed(1)}% Complete
            {percentage >= 100 ? (
              <span className="text-primary">🎉 Goal Achieved!</span>
            ) : percentage >= 80 ? (
              <span className="text-primary">🔥 Almost there!</span>
            ) : (
              <span className="text-muted-foreground">Keep going! 💪</span>
            )}
          </div>
          <div className="flex items-center gap-2 leading-none text-muted-foreground">
            {weeklyGoal - workoutsCompleted > 0 ? (
              `${weeklyGoal - workoutsCompleted} more workout${weeklyGoal - workoutsCompleted !== 1 ? 's' : ''} to go`
            ) : (
              "Weekly goal completed! 🚀"
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default WeeklyGoalsChart