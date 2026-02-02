import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-violet-600 text-white',
        secondary: 'bg-gray-800 text-gray-100',
        destructive: 'bg-red-600 text-white',
        success: 'bg-emerald-600 text-white',
        warning: 'bg-amber-600 text-white',
        outline: 'border border-gray-700 text-gray-100',
        live: 'bg-red-600 text-white animate-pulse',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
