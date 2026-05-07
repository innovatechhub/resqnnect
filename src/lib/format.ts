export function formatTimeAgo(isoDate: string): string {
  const now = new Date();
  const value = new Date(isoDate);
  const diffSeconds = Math.floor((now.getTime() - value.getTime()) / 1000);

  if (!Number.isFinite(diffSeconds) || diffSeconds < 0) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function prettyStatus(value: string): string {
  return value.replaceAll('_', ' ');
}

export function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
