import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportModal } from './ReportModal';

interface ReportButtonProps {
  reportedUserId?: string | null;
  reportedEventId?: string | null;
  reportedMessageId?: string | null;
  contextLabel?: string;
  variant?: 'ghost' | 'outline' | 'destructive';
  size?: 'sm' | 'icon' | 'default';
  showLabel?: boolean;
}

export const ReportButton = ({
  reportedUserId,
  reportedEventId,
  reportedMessageId,
  contextLabel,
  variant = 'ghost',
  size = 'sm',
  showLabel = false,
}: ReportButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="text-muted-foreground hover:text-destructive gap-1.5"
        aria-label="Denunciar"
      >
        <Flag className="w-4 h-4" />
        {showLabel && <span>Denunciar</span>}
      </Button>

      <ReportModal
        open={open}
        onOpenChange={setOpen}
        reportedUserId={reportedUserId}
        reportedEventId={reportedEventId}
        reportedMessageId={reportedMessageId}
        contextLabel={contextLabel}
      />
    </>
  );
};
