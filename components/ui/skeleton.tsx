'use client';

import { cn } from '@/lib/utils';

/**
 * ATLAS Skeleton Components
 * 
 * Loading placeholders using Atlas design system colors.
 * All colors use the dark theme tokens: #0B0B0C, #111214, #1F2226
 */

export interface SkeletonProps {
  className?: string;
}

/**
 * Basic Skeleton — Pulsing background
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-[#1F2226] rounded',
        className
      )}
    />
  );
}

/**
 * Shimmer Skeleton — Animated gradient
 */
export function SkeletonShimmer({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-shimmer bg-gradient-to-r from-[#1F2226] via-[#111214] to-[#1F2226] rounded',
        className
      )}
    />
  );
}

/**
 * Card Skeleton
 */
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('bg-[#111214] border border-[#1F2226] rounded-[10px] p-4 space-y-3', className)}>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Card Grid Skeleton
 */
export function SkeletonCardGrid({ count = 4, className }: SkeletonProps & { count?: number }) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/**
 * List Item Skeleton
 */
export function SkeletonListItem({ className }: SkeletonProps) {
  return (
    <div className={cn('flex items-center gap-3 py-3', className)}>
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  );
}

/**
 * List Skeleton
 */
export function SkeletonList({ count = 5, className }: SkeletonProps & { count?: number }) {
  return (
    <div className={cn('divide-y divide-[#1F2226]', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  );
}

/**
 * Stats Skeleton
 */
export function SkeletonStats({ className }: SkeletonProps) {
  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-3', className)}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-[#111214] rounded-[10px] p-3 space-y-2 border border-[#1F2226]">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-12" />
        </div>
      ))}
    </div>
  );
}

/**
 * Table Skeleton
 */
export function SkeletonTable({ rows = 5, className }: SkeletonProps & { rows?: number }) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-[#1F2226]">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-1/6" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/6" />
        </div>
      ))}
    </div>
  );
}

/**
 * Page Header Skeleton
 */
export function SkeletonHeader({ className }: SkeletonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

/**
 * Agent Card Skeleton
 */
export function SkeletonAgentCard({ className }: SkeletonProps) {
  return (
    <div className={cn('bg-[#111214] rounded-[10px] p-4 space-y-4 border border-[#1F2226]', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="w-2 h-2 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <div className="space-y-1">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
    </div>
  );
}

/**
 * Metric Box Skeleton
 */
export function SkeletonMetric({ className }: SkeletonProps) {
  return (
    <div className={cn('bg-[#111214] rounded-[10px] p-3 border border-[#1F2226]', className)}>
      <Skeleton className="h-3 w-16 mb-2" />
      <Skeleton className="h-6 w-12" />
    </div>
  );
}

/**
 * Full Page Loading State
 */
export function SkeletonPage() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonStats />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonCard />
      </div>
    </div>
  );
}
