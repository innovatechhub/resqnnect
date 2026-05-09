import type { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export function TableContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('overflow-auto rounded-md border border-border bg-card', className)} {...props} />;
}

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full border-collapse text-sm', className)} {...props} />;
}

export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-muted/70 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-muted/95', className)} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-border hover:bg-muted/40', className)} {...props} />;
}

export function TableHeaderCell({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn('px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground', className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-3 py-2 align-middle text-foreground', className)} {...props} />;
}

export type SortDirection = 'asc' | 'desc' | null;

interface SortableHeaderProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortKey: string;
  currentSort?: string | null;
  currentDir?: SortDirection;
  onSort?: (key: string, dir: SortDirection) => void;
  children: React.ReactNode;
}

export function SortableHeader({
  sortKey,
  currentSort,
  currentDir,
  onSort,
  children,
  className,
  ...props
}: SortableHeaderProps) {
  const isSorted = currentSort === sortKey;
  const isAsc = isSorted && currentDir === 'asc';
  const isDesc = isSorted && currentDir === 'desc';

  function handleClick() {
    if (!onSort) return;
    if (isSorted && isAsc) {
      onSort(sortKey, 'desc');
    } else if (isSorted && isDesc) {
      onSort(sortKey, null);
    } else {
      onSort(sortKey, 'asc');
    }
  }

  return (
    <th
      className={cn(
        'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground',
        onSort && 'cursor-pointer select-none hover:text-foreground',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      <div className="flex items-center gap-2">
        <span>{children}</span>
        {isSorted && (isAsc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
      </div>
    </th>
  );
}
