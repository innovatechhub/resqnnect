import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../../lib/utils';
import { Button } from './button';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  showDefaultCloseButton?: boolean;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  showDefaultCloseButton = true,
}: DialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onOpenChange, open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4" onClick={() => onOpenChange(false)}>
      <div
        className={cn('w-full max-w-2xl rounded-lg border border-border bg-card shadow-2xl', className)}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <div className="max-h-[75vh] overflow-auto px-5 py-4">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          {showDefaultCloseButton ? (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          ) : null}
          {footer}
        </div>
      </div>
    </div>,
    document.body,
  );
}
