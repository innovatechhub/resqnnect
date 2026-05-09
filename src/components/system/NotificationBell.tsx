import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={popoverRef}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80">
          <Card className="border-border/80 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Bell className="mx-auto h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Real-time alerts will appear here
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
