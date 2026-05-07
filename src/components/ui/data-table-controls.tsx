import { Search } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Input } from './input';

interface DataTableToolbarProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  summary?: string;
  className?: string;
}

export function DataTableToolbar({
  value,
  onValueChange,
  placeholder = 'Search table...',
  summary,
  className,
}: DataTableToolbarProps) {
  return (
    <div className={cn('flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <label className="relative block w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </label>
      {summary ? <p className="text-xs uppercase tracking-wide text-muted-foreground">{summary}</p> : null}
    </div>
  );
}

interface DataTablePaginationProps {
  page: number;
  pageCount: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function DataTablePagination({
  page,
  pageCount,
  totalCount,
  pageSize,
  onPageChange,
}: DataTablePaginationProps) {
  const start = totalCount === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(totalCount, (page + 1) * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm">
      <p className="text-muted-foreground">
        Showing {start}-{end} of {totalCount}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="text-muted-foreground">
          Page {pageCount === 0 ? 0 : page + 1} of {pageCount}
        </span>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page >= pageCount - 1 || pageCount === 0}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
