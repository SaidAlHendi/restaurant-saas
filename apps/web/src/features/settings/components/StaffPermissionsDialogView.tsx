import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Spinner,
  Switch,
} from '@app/ui';

import type { StaffPermissionsDialogViewModel } from '../hooks/use-staff-permissions-dialog.js';

type Props = StaffPermissionsDialogViewModel & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StaffPermissionsDialogView(props: Props) {
  const { open, onOpenChange, isLoading, isError, items, hasOverrides, submitting, labels } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={labels.close}>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {isLoading ? <Spinner label={labels.loading} /> : null}
          {isError ? <p className="text-destructive text-sm">{labels.loadError}</p> : null}
          {!isLoading && !isError ? (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.key} className="flex items-center justify-between gap-4">
                  <Label htmlFor={`perm-${item.key}`} className="flex items-center gap-2">
                    {item.label}
                    {item.overridden ? <Badge variant="secondary">{labels.overridden}</Badge> : null}
                  </Label>
                  <Switch
                    id={`perm-${item.key}`}
                    checked={item.enabled}
                    onCheckedChange={(checked) => {
                      props.onToggle(item.key, checked);
                    }}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={!hasOverrides || submitting}
            onClick={props.onReset}
          >
            {labels.reset}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {labels.cancel}
          </Button>
          <Button type="button" disabled={isLoading || isError || submitting} onClick={props.onSave}>
            {labels.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
