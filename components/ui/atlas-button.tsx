/**
 * @format
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

/**
 * ATLAS Button Component
 * 
 * Unified button system with Atlas design system tokens.
 * All variants use the strict color palette:
 * - Primary: #FF6A00 (orange, brand/action)
 * - Secondary: transparent with border
 * - Ghost: transparent minimal
 * - Danger: #FF3B30 (critical actions)
 * 
 * NO blue/purple/violet accents permitted.
 */

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0C]',
  {
    variants: {
      variant: {
        // Primary — Brand orange, main actions
        primary: 
          'bg-[#FF6A00] text-white border border-[#FF6A00] ' +
          'hover:brightness-110 active:brightness-90 active:scale-[0.98]',
        
        // Secondary — Bordered, lower emphasis
        secondary: 
          'bg-transparent text-white border border-[#1F2226] ' +
          'hover:bg-[#1F2226] hover:border-[#6B7280]',
        
        // Ghost — Minimal, icon buttons
        ghost: 
          'bg-transparent text-[#9BA3AF] border border-transparent ' +
          'hover:text-white hover:bg-[#1F2226]',
        
        // Danger — Destructive actions
        danger: 
          'bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/30 ' +
          'hover:bg-[#FF3B30]/20 active:bg-[#FF3B30]/30',
        
        // Success — Positive/completion actions
        success: 
          'bg-[#16C784]/10 text-[#16C784] border border-[#16C784]/30 ' +
          'hover:bg-[#16C784]/20 active:bg-[#16C784]/30',
      },
      size: {
        lg: 'h-10 px-4 text-sm rounded-lg',
        default: 'h-8 px-3 text-xs rounded-lg',
        sm: 'h-6 px-2 text-[10px] rounded',
        icon: 'h-8 w-8 p-2 rounded-lg',
        'icon-sm': 'h-6 w-6 p-1.5 rounded',
        'icon-lg': 'h-10 w-10 p-2.5 rounded-lg',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
      fullWidth: false,
    },
  }
);

export interface AtlasButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const AtlasButton = React.forwardRef<HTMLButtonElement, AtlasButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fullWidth, 
    asChild = false,
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : 'button';
    
    // Merge loading state with disabled
    const isDisabled = disabled || loading;
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            {children}
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </Comp>
    );
  }
);

AtlasButton.displayName = 'AtlasButton';

export { AtlasButton, buttonVariants };
