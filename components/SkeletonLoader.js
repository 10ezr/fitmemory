"use client"

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * Universal skeleton loader component that matches FitMemory's design
 */
export function SkeletonCard({ hasHeader = true, contentLines = 3, className = "" }) {
  return (
    <Card className={`border ${className}`}>
      {hasHeader && (
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
      )}
      <CardContent className={hasHeader ? "pt-0" : "p-6"}>
        <div className="space-y-3">
          {Array.from({ length: contentLines }, (_, i) => (
            <Skeleton key={i} className={`h-3 w-${i === contentLines - 1 ? '3/4' : 'full'}`} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function SkeletonStat({ className = "" }) {
  return (
    <Card className={`border bg-card/30 backdrop-blur-sm ${className}`}>
      <CardContent className="p-4 text-center space-y-2">
        <Skeleton className="h-6 w-12 mx-auto" />
        <Skeleton className="h-3 w-16 mx-auto" />
        <Skeleton className="h-2 w-8 mx-auto" />
      </CardContent>
    </Card>
  )
}

export function SkeletonReadiness({ className = "" }) {
  return (
    <Card className={`border bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/50 dark:to-slate-950/50 ${className}`}>
      <CardContent className="p-6 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-12 w-12 mx-auto rounded-full" />
        <Skeleton className="h-3 w-16 mx-auto" />
        <Skeleton className="h-2 w-full" />
      </CardContent>
    </Card>
  )
}

export function SkeletonWeekOverview({ className = "" }) {
  return (
    <Card className={`border ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-3 w-3 mx-auto mb-1" />
              <Skeleton className="h-8 w-8 rounded-sm mx-auto" />
            </div>
          ))}
        </div>
        <Skeleton className="h-3 w-32 mx-auto" />
      </CardContent>
    </Card>
  )
}

export function SkeletonTimer({ className = "" }) {
  return (
    <Card className={`border ${className}`}>
      <CardContent className="p-6 space-y-4">
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-32 mx-auto" />
          <Skeleton className="h-4 w-24 mx-auto" />
        </div>
        <div className="border-t pt-4">
          <Skeleton className="h-4 w-20 mb-3" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="bg-card/50 border rounded-lg p-3 text-center">
                <Skeleton className="h-6 w-8 mx-auto mb-1" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function SkeletonAnalytics({ className = "" }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonStat key={i} />
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border">
          <CardHeader>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full rounded" />
          </CardContent>
        </Card>
        <Card className="border">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full rounded" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function SkeletonChatList({ className = "", count = 3 }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <Card className={`max-w-3xl ${
            i % 2 === 0 
              ? 'bg-neutral-800 border-border/50' 
              : 'bg-primary border-primary/20'
          }`}>
            <CardContent className="py-2 px-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                {Math.random() > 0.5 && <Skeleton className="h-4 w-3/4" />}
                {Math.random() > 0.7 && <Skeleton className="h-4 w-1/2" />}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}