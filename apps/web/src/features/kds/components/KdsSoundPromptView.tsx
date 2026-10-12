import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/ui';

export type KdsSoundPromptViewProps = {
  open: boolean;
  title: string;
  description: string;
  enableLabel: string;
  skipLabel: string;
  onEnable: () => void;
  onSkip: () => void;
};

/** Browsers block audio until a tap, so the KDS asks once on load. */
export function KdsSoundPromptView({
  open,
  title,
  description,
  enableLabel,
  skipLabel,
  onEnable,
  onSkip,
}: KdsSoundPromptViewProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onSkip();
        }
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" size="touch" variant="outline" onClick={onSkip}>
            {skipLabel}
          </Button>
          <Button type="button" size="touch" onClick={onEnable}>
            {enableLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
