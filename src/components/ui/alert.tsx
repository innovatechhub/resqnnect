import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

const alertVariants = cva('relative w-full rounded-lg border p-4 [&>svg~*]:pl-7', {
  variants: {
    variant: {
      default: 'border-border text-foreground',
      destructive: 'border-destructive/30 text-destructive',
      warning: 'border-amber-300 bg-amber-50 text-amber-900',
      success: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface AlertProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, ...props }: AlertProps) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />;
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <div className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />;
}
