"use client"

import { RadialBar, RadialBarChart, PolarGrid, PolarRadiusAxis, Label } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"

export function WeeklyGoalsChart({ workoutsCompleted = 0, weeklyGoal = 7, className = "" }) {
  const pct = Math.max(0, Math.min(100, Math.round((workoutsCompleted / weeklyGoal) * 100)))
  const chartData = [
    { key: "progress", value: pct, fill: "hsl(var(--primary))" },
  ]

  const chartConfig = {
    progress: { label: "Progress", color: "hsl(var(--primary))" },
  }

  return (
    <Card className={className + " rounded-md"}>
      <CardContent className="pt-3">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[140px]">
          <RadialBarChart data={chartData} startAngle={0} endAngle={(pct/100)*360} innerRadius={60} outerRadius={76}>
            <PolarGrid gridType="circle" radialLines={false} stroke="none" className="first:fill-muted last:fill-background" polarRadius={[62, 50]} />
            <RadialBar dataKey="value" background cornerRadius={8} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">{pct}%</tspan>
                      <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 18} className="fill-muted-foreground text-xs">{workoutsCompleted}/{weeklyGoal}</tspan>
                    </text>
                  )
                }
                return null
              }} />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default WeeklyGoalsChart