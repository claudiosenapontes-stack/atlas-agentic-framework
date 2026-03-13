/**
 * @format
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Loader2, 
  Circle,
  type LucideIcon 
} from 'lucide-react';

/**
 * ATLAS Status Badge System
 * 
 * Unified status indicators using Atlas design system tokens.
 * 
 * Color Semantics:
 * - success:    #16C784 (green) — Operational, verified, completed, healthy
 * - warning:    #FFB020 (yellow) — In progress, partial, preview, pending
 * - critical:   #FF3B30 (red) — Failed, error, down, blocked
 * - neutral:    #9BA3AF (gray) — Default, unspecified
 * - info:       #6B7280 (muted) — Informational, disabled
 * 
 * NO blue/purple/violet accents permitted.
 */

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
  {
    variants: {
      variant: {
        // Success — Green for verified/operational states
        success: 
          'bg-[#16C784]/10 text-[#16C784] border border-[#16C784]/30',
        
        // Warning — Yellow for in-progress/partial states  
        warning: 
          'bg-[#FFB020]/10 text-[#FFB020] border border-[#FFB020]/30',
        
        // Critical — Red for error/failed states
        critical: 
          'bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/30',
        
        // Neutral — Gray for default/unspecified
        neutral: 
          'bg-[#1F2226] text-[#9BA3AF] border border-[#1F2226]',
        
        // Info — Muted for informational
        info: 
          'bg-[#0B0B0C] text-[#6B7280] border border-[#1F2226]',
        
        // Outline variants for less emphasis
        'outline-success': 
          'bg-transparent text-[#16C784] border border-[#16C784]/50',
        'outline-warning': 
          'bg-transparent text-[#FFB020] border border-[#FFB020]/50',
        'outline-critical': 
          'bg-transparent text-[#FF3B30] border border-[#FF3B30]/50',
      },
      size: {
        sm: 'text-[9px] px-1.5 py-0.5',
        default: 'text-[10px] px-2 py-0.5',
        lg: 'text-xs px-2.5 py-1',
      },
      dot: {
        true: '',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'default',
      dot: true,
    },
  }
);

// Predefined status configurations for common use cases
const STATUS_CONFIG: Record<string, { variant: VariantProps<typeof badgeVariants>['variant']; icon: LucideIcon; label: string }> = {
  // Operational states
  operational: { variant: 'success', icon: CheckCircle2, label: 'Operational' },
  verified: { variant: 'success', icon: CheckCircle2, label: 'Verified' },
  completed: { variant: 'success', icon: CheckCircle2, label: 'Completed' },
  healthy: { variant: 'success', icon: CheckCircle2, label: 'Healthy' },
  live: { variant: 'success', icon: CheckCircle2, label: 'Live' },
  
  // In-progress states
  in_progress: { variant: 'warning', icon: Loader2, label: 'In Progress' },
  partial: { variant: 'warning', icon: Clock, label: 'Partial' },
  preview: { variant: 'warning', icon: Clock, label: 'Preview' },
  pending: { variant: 'warning', icon: Clock, label: 'Pending' },
  validating: { variant: 'warning', icon: Loader2, label: 'Validating' },
  
  // Error states
  error: { variant: 'critical', icon: XCircle, label: 'Error' },
  failed: { variant: 'critical', icon: XCircle, label: 'Failed' },
  degraded: { variant: 'critical', icon: AlertCircle, label: 'Degraded' },
  blocked: { variant: 'critical', icon: AlertCircle, label: 'Blocked' },
  down: { variant: 'critical', icon: XCircle, label: 'Down' },
  
  // Neutral states
  unknown: { variant: 'neutral', icon: Circle, label: 'Unknown' },
  planned: { variant: 'neutral', icon: Circle, label: 'Planned' },
  archived: { variant: 'info', icon: Circle, label: 'Archived' },
  draft: { variant: 'info', icon: Circle, label: 'Draft' },
};

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  status?: keyof typeof STATUS_CONFIG;
  customLabel?: string;
  showIcon?: boolean;
  animate?: boolean;
}

/**
 * StatusBadge — Atlas Design System Status Indicator
 * 
 * Usage:
 * ```tsx
 * <StatusBadge status="operational" />
 * <StatusBadge status="in_progress" />
 * <StatusBadge variant="success" customLabel="Deployed" />
 * <StatusBadge variant="warning" dot={false}>Custom Text</StatusBadge>
 * ```
 */
const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ 
    className, 
    variant,
    size,
    dot = true,
    status,
    customLabel,
    showIcon = true,
    animate = false,
    children,
    ...props 
  }, ref) => {
    // If a predefined status is provided, use its configuration
    const config = status ? STATUS_CONFIG[status] : null;
    const effectiveVariant = config?.variant || variant || 'neutral';
    const Icon = config?.icon;
    const label = customLabel || config?.label || children;
    
    // Determine dot color based on variant
    const dotColors: Record<string, string> = {
      success: 'bg-[#16C784]',
      warning: 'bg-[#FFB020]',
      critical: 'bg-[#FF3B30]',
      neutral: 'bg-[#6B7280]',
      info: 'bg-[#4B5563]',
      'outline-success': 'bg-[#16C784]',
      'outline-warning': 'bg-[#FFB020]',
      'outline-critical': 'bg-[#FF3B30]',
    };
    
    const dotColor = dotColors[effectiveVariant || 'neutral'];
    const shouldAnimate = animate && (effectiveVariant === 'warning' || status === 'in_progress');
    
    return (
      <span
        className={cn(badgeVariants({ variant: effectiveVariant, size, dot }), className)}
        ref={ref}
        {...props}
      >
        {dot && !Icon && (
          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColor, shouldAnimate && 'animate-pulse')} />
        )}
        {showIcon && Icon && (
          <Icon className={cn('w-3 h-3 flex-shrink-0', shouldAnimate && 'animate-spin')} />
        )}
        <span>{label}</span>
      </span>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

/**
 * StatusBadgeGroup — Multiple statuses in a row
 */
interface StatusBadgeGroupProps {
  statuses: Array<{ status: keyof typeof STATUS_CONFIG; label?: string }>;
  className?: string;
}

function StatusBadgeGroup({ statuses, className }: StatusBadgeGroupProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {statuses.map((s, i) => (
        <StatusBadge key={i} status={s.status} customLabel={s.label} />
      ))}
    </div>
  );
}

export { StatusBadge, StatusBadgeGroup, badgeVariants, STATUS_CONFIG };
