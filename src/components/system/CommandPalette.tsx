import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Command } from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth';
import { ROLE_NAV_LINKS } from '../../constants/navigation';
import { Dialog } from '../ui/dialog';
import { Input } from '../ui/input';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const auth = useAuth();
  const currentRole = auth.role ?? 'household';
  const navLinks = ROLE_NAV_LINKS[currentRole];

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const filteredLinks = navLinks.filter(
    (link) =>
      link.label.toLowerCase().includes(search.toLowerCase()) ||
      link.to.toLowerCase().includes(search.toLowerCase())
  );

  function handleNavigate(to: string) {
    navigate(to);
    setOpen(false);
    setSearch('');
  }

  return (
    <Dialog open={open} onOpenChange={setOpen} title="Command Palette">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search navigation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        <div className="space-y-1 max-h-80 overflow-auto">
          {filteredLinks.length > 0 ? (
            filteredLinks.map((link) => (
              <button
                key={link.to}
                onClick={() => handleNavigate(link.to)}
                className="w-full rounded-md border border-border/70 bg-muted/35 px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {link.label}
              </button>
            ))
          ) : (
            <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-5 text-center">
              <p className="text-sm text-muted-foreground">No results found</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/70 pt-3">
          <p className="text-xs text-muted-foreground">
            Keyboard shortcut: <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">Cmd K</kbd>
          </p>
          <button
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Esc
          </button>
        </div>
      </div>
    </Dialog>
  );
}
