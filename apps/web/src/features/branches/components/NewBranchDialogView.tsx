import { PlusIcon } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/ui';

import type { NewBranchDialogViewModel } from '../hooks/use-new-branch-dialog.js';

export function NewBranchDialogView(props: NewBranchDialogViewModel) {
  const {
    open,
    onOpenChange,
    name,
    onNameChange,
    timezone,
    onTimezoneChange,
    timezoneOptions,
    error,
    submitting,
    onSubmit,
    labels,
  } = props;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          onOpenChange(true);
        }}
      >
        <PlusIcon aria-hidden />
        {labels.trigger}
      </Button>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.title}</DialogTitle>
            <DialogDescription>{labels.description}</DialogDescription>
          </DialogHeader>
          <form
            className="contents"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            <DialogBody>
              <div className="space-y-2">
                <Label htmlFor="new-branch-name">{labels.name}</Label>
                <Input
                  id="new-branch-name"
                  value={name}
                  placeholder={labels.namePlaceholder}
                  autoFocus
                  onChange={(e) => {
                    onNameChange(e.target.value);
                  }}
                />
                {error ? <p className="text-destructive text-xs">{error}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>{labels.timezone}</Label>
                <Select value={timezone} onValueChange={onTimezoneChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezoneOptions.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onOpenChange(false);
                }}
              >
                {labels.cancel}
              </Button>
              <Button type="submit" disabled={submitting}>
                {labels.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
