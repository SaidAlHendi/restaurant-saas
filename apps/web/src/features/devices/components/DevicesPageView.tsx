import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@app/ui';

import type { DevicesPageViewModel } from '../hooks/use-devices-page.js';

export function DevicesPageView(props: DevicesPageViewModel) {
  const {
    isLoading,
    isError,
    rows,
    branchOptions,
    createOpen,
    onCreateOpenChange,
    openCreate,
    name,
    onNameChange,
    nameError,
    branchId,
    onBranchChange,
    creating,
    onSubmitCreate,
    pairingCode,
    revokeOpen,
    revokeName,
    onRevokeOpenChange,
    revoking,
    onConfirmRevoke,
    labels,
  } = props;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner label={labels.loading} />
      </div>
    );
  }
  if (isError) {
    return <p className="text-destructive p-6">{labels.loadError}</p>;
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{labels.title}</h1>
          <p className="text-muted-foreground mt-1">{labels.description}</p>
        </div>
        <Button type="button" onClick={openCreate}>
          {labels.add}
        </Button>
      </div>

      <DataTable
        columns={[
          { id: 'name', header: labels.columnName, cell: (row) => row.name },
          { id: 'branch', header: labels.columnBranch, cell: (row) => row.branchName },
          {
            id: 'status',
            header: labels.columnStatus,
            cell: (row) => <Badge variant={row.statusTone}>{row.statusLabel}</Badge>,
          },
          { id: 'lastUsed', header: labels.columnLastUsed, cell: (row) => row.lastUsedLabel },
        ]}
        data={rows}
        getRowId={(row) => row.id}
        emptyState={<EmptyState title={labels.empty} />}
        labels={{ actions: labels.actions, sortBy: labels.actions }}
        rowActions={(row) => (
          <Button type="button" variant="outline" size="sm" onClick={row.onRevoke}>
            {labels.remove}
          </Button>
        )}
      />

      <Dialog open={createOpen} onOpenChange={onCreateOpenChange}>
        <DialogContent closeLabel={labels.close}>
          {pairingCode === null ? (
            <>
              <DialogHeader>
                <DialogTitle>{labels.createTitle}</DialogTitle>
                <DialogDescription>{labels.createDescription}</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className="space-y-2">
                  <Label htmlFor="device-name">{labels.nameLabel}</Label>
                  <Input
                    id="device-name"
                    value={name}
                    onChange={(event) => {
                      onNameChange(event.target.value);
                    }}
                  />
                  {nameError ? <p className="text-destructive text-sm">{nameError}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label>{labels.branchLabel}</Label>
                  <Select value={branchId} onValueChange={onBranchChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branchOptions.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onCreateOpenChange(false);
                  }}
                >
                  {labels.cancel}
                </Button>
                <Button type="button" disabled={creating} onClick={onSubmitCreate}>
                  {labels.createSubmit}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{labels.codeTitle}</DialogTitle>
                <DialogDescription>{labels.codeHint}</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <p
                  dir="ltr"
                  className="bg-muted rounded-lg py-4 text-center font-mono text-3xl font-semibold tracking-[0.3em]"
                  data-testid="pairing-code"
                >
                  {`${pairingCode.slice(0, 4)} ${pairingCode.slice(4)}`}
                </p>
                <p className="text-muted-foreground text-sm">{labels.codeSteps}</p>
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => {
                    onCreateOpenChange(false);
                  }}
                >
                  {labels.done}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={revokeOpen}
        onOpenChange={onRevokeOpenChange}
        title={labels.removeTitle}
        description={`${labels.removeDescription} ${revokeName}`}
        confirmLabel={labels.remove}
        cancelLabel={labels.cancel}
        variant="destructive"
        isConfirming={revoking}
        onConfirm={() => {
          onConfirmRevoke();
        }}
      />
    </div>
  );
}
