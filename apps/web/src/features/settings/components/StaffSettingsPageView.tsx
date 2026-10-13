import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Switch,
} from '@app/ui';

import type { StaffRoleOption, StaffSettingsPageViewModel } from '../hooks/use-staff-settings-page.js';

type BranchScopeProps = {
  allBranches: boolean;
  branchIds: string[];
  branchOptions: StaffSettingsPageViewModel['branchOptions'];
  scopeError: string | null;
  labels: StaffSettingsPageViewModel['labels'];
  onAllBranchesChange: (checked: boolean) => void;
  onBranchToggle: (branchId: string, checked: boolean) => void;
};

function StaffBranchScopeFields(props: BranchScopeProps) {
  const { allBranches, branchIds, branchOptions, scopeError, labels, onAllBranchesChange, onBranchToggle } =
    props;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="all-branches">{labels.allBranches}</Label>
        <Switch
          id="all-branches"
          checked={allBranches}
          onCheckedChange={onAllBranchesChange}
        />
      </div>
      {!allBranches ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{labels.branches}</p>
          {branchOptions.map((branch) => (
            <div key={branch.id} className="flex items-center justify-between gap-4">
              <span className="text-sm">{branch.name}</span>
              <Switch
                checked={branchIds.includes(branch.id)}
                onCheckedChange={(checked) => {
                  onBranchToggle(branch.id, checked);
                }}
              />
            </div>
          ))}
        </div>
      ) : null}
      {scopeError ? <p className="text-destructive text-sm">{scopeError}</p> : null}
    </div>
  );
}

type RoleSelectProps = {
  value: string;
  options: StaffRoleOption[];
  onChange: (value: string) => void;
  label: string;
};

function StaffRoleSelect(props: RoleSelectProps) {
  const { value, options, onChange, label } = props;
  const selected = options.find((o) => o.value === value);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected ? <p className="text-muted-foreground text-sm">{selected.description}</p> : null}
    </div>
  );
}

export function StaffSettingsPageView(props: StaffSettingsPageViewModel) {
  const {
    isLoading,
    isError,
    rows,
    canAddStaff,
    branchOptions,
    inviteRoleOptions,
    editRoleOptions,
    pinOnlyRoleOptions,
    inviteOpen,
    onInviteOpenChange,
    pinOnlyOpen,
    onPinOnlyOpenChange,
    inviteEmail,
    onInviteEmailChange,
    inviteEmailError,
    inviteRole,
    onInviteRoleChange,
    inviteScope,
    onInviteAllBranchesChange,
    onInviteBranchToggle,
    inviteScopeError,
    inviteSubmitting,
    onSubmitInvite,
    pinOnlyName,
    onPinOnlyNameChange,
    pinOnlyNameError,
    pinOnlyRole,
    onPinOnlyRoleChange,
    pinOnlyScope,
    onPinOnlyAllBranchesChange,
    onPinOnlyBranchToggle,
    pinOnlyScopeError,
    pinOnlyPin,
    onPinOnlyPinChange,
    pinOnlyPinConfirm,
    onPinOnlyPinConfirmChange,
    pinOnlyPinError,
    pinOnlySubmitting,
    onSubmitPinOnly,
    editOpen,
    onEditOpenChange,
    editRole,
    onEditRoleChange,
    editScope,
    onEditAllBranchesChange,
    onEditBranchToggle,
    editScopeError,
    editSubmitting,
    onSubmitEdit,
    pinDialogOpen,
    onPinDialogOpenChange,
    pinDialogMemberName,
    pinValue,
    onPinValueChange,
    pinConfirm,
    onPinConfirmChange,
    pinFormError,
    pinSubmitting,
    onSubmitPinDialog,
    removePinOpen,
    onRemovePinOpenChange,
    removePinMemberName,
    removePinSubmitting,
    onConfirmRemovePin,
    disableConfirmOpen,
    onDisableConfirmOpenChange,
    disableMemberName,
    disableConfirmSubmitting,
    onConfirmDisable,
    revokeConfirmOpen,
    onRevokeConfirmOpenChange,
    revokeMemberName,
    revokeConfirmSubmitting,
    onConfirmRevoke,
    inviteLinkOpen,
    onInviteLinkOpenChange,
    inviteLinkUrl,
    inviteLinkCopyLabel,
    onCopyInviteLink,
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
    return <p className="text-destructive">{labels.loadError}</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{labels.title}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{labels.description}</p>
        </div>
        {canAddStaff ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button">{labels.addStaff}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {inviteRoleOptions.length > 0 ? (
                <DropdownMenuItem
                  onClick={() => {
                    onInviteOpenChange(true);
                  }}
                >
                  {labels.addStaffInvite}
                </DropdownMenuItem>
              ) : null}
              {pinOnlyRoleOptions.length > 0 ? (
                <DropdownMenuItem
                  onClick={() => {
                    onPinOnlyOpenChange(true);
                  }}
                >
                  {labels.addStaffPinOnly}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      <DataTable
        columns={[
          { id: 'name', header: labels.columnName, cell: (row) => row.name },
          { id: 'email', header: labels.columnEmail, cell: (row) => row.emailLabel },
          { id: 'role', header: labels.columnRole, cell: (row) => row.roleLabel },
          {
            id: 'status',
            header: labels.columnStatus,
            cell: (row) => <Badge variant={row.statusTone}>{row.statusLabel}</Badge>,
          },
          { id: 'pin', header: labels.columnPin, cell: (row) => row.pinLabel },
        ]}
        data={rows}
        getRowId={(row) => row.id}
        emptyState={<EmptyState title={labels.empty} />}
        labels={{ actions: labels.actions, sortBy: labels.actions }}
        rowActions={(row) => {
          const hasMenu =
            row.onEdit ??
            row.onSetPin ??
            row.onRemovePin ??
            row.onDisable ??
            row.onEnable ??
            row.onRegenerateInvite ??
            row.onRevokeInvite;
          if (!hasMenu) {
            return null;
          }
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  {labels.actions}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {row.onEdit ? (
                  <DropdownMenuItem
                    onClick={() => {
                      row.onEdit?.();
                    }}
                  >
                    {labels.edit}
                  </DropdownMenuItem>
                ) : null}
                {row.onSetPin ? (
                  <DropdownMenuItem
                    onClick={() => {
                      row.onSetPin?.();
                    }}
                  >
                    {labels.setPin}
                  </DropdownMenuItem>
                ) : null}
                {row.onRemovePin ? (
                  <DropdownMenuItem
                    onClick={() => {
                      row.onRemovePin?.();
                    }}
                  >
                    {labels.removePin}
                  </DropdownMenuItem>
                ) : null}
                {row.onDisable ? (
                  <DropdownMenuItem
                    onClick={() => {
                      row.onDisable?.();
                    }}
                  >
                    {labels.disable}
                  </DropdownMenuItem>
                ) : null}
                {row.onEnable ? (
                  <DropdownMenuItem
                    onClick={() => {
                      row.onEnable?.();
                    }}
                  >
                    {labels.enable}
                  </DropdownMenuItem>
                ) : null}
                {row.onRegenerateInvite ? (
                  <DropdownMenuItem
                    onClick={() => {
                      row.onRegenerateInvite?.();
                    }}
                  >
                    {labels.regenerateInvite}
                  </DropdownMenuItem>
                ) : null}
                {row.onRevokeInvite ? (
                  <DropdownMenuItem
                    onClick={() => {
                      row.onRevokeInvite?.();
                    }}
                  >
                    {labels.revokeInvite}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }}
      />

      <Dialog open={inviteOpen} onOpenChange={onInviteOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{labels.inviteDialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">{labels.inviteEmail}</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => {
                  onInviteEmailChange(e.target.value);
                }}
              />
              {inviteEmailError ? <p className="text-destructive text-sm">{inviteEmailError}</p> : null}
            </div>
            <StaffRoleSelect
              label={labels.inviteRole}
              value={inviteRole}
              options={inviteRoleOptions}
              onChange={onInviteRoleChange}
            />
            <StaffBranchScopeFields
              allBranches={inviteScope.allBranches}
              branchIds={inviteScope.branchIds}
              branchOptions={branchOptions}
              scopeError={inviteScopeError}
              labels={labels}
              onAllBranchesChange={onInviteAllBranchesChange}
              onBranchToggle={onInviteBranchToggle}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onInviteOpenChange(false);
              }}
            >
              {labels.cancel}
            </Button>
            <Button type="button" disabled={inviteSubmitting} onClick={onSubmitInvite}>
              {labels.inviteSubmit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pinOnlyOpen} onOpenChange={onPinOnlyOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{labels.pinOnlyDialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin-only-name">{labels.pinOnlyName}</Label>
              <Input
                id="pin-only-name"
                value={pinOnlyName}
                onChange={(e) => {
                  onPinOnlyNameChange(e.target.value);
                }}
              />
              {pinOnlyNameError ? <p className="text-destructive text-sm">{pinOnlyNameError}</p> : null}
            </div>
            <StaffRoleSelect
              label={labels.inviteRole}
              value={pinOnlyRole}
              options={pinOnlyRoleOptions}
              onChange={onPinOnlyRoleChange}
            />
            <StaffBranchScopeFields
              allBranches={pinOnlyScope.allBranches}
              branchIds={pinOnlyScope.branchIds}
              branchOptions={branchOptions}
              scopeError={pinOnlyScopeError}
              labels={labels}
              onAllBranchesChange={onPinOnlyAllBranchesChange}
              onBranchToggle={onPinOnlyBranchToggle}
            />
            <div className="space-y-2">
              <Label htmlFor="pin-only-pin">{labels.pinLabel}</Label>
              <Input
                id="pin-only-pin"
                inputMode="numeric"
                autoComplete="off"
                value={pinOnlyPin}
                onChange={(e) => {
                  onPinOnlyPinChange(e.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin-only-confirm">{labels.pinConfirmLabel}</Label>
              <Input
                id="pin-only-confirm"
                inputMode="numeric"
                autoComplete="off"
                value={pinOnlyPinConfirm}
                onChange={(e) => {
                  onPinOnlyPinConfirmChange(e.target.value);
                }}
              />
              {pinOnlyPinError ? <p className="text-destructive text-sm">{pinOnlyPinError}</p> : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onPinOnlyOpenChange(false);
              }}
            >
              {labels.cancel}
            </Button>
            <Button type="button" disabled={pinOnlySubmitting} onClick={onSubmitPinOnly}>
              {labels.pinOnlySubmit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={onEditOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{labels.editDialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <StaffRoleSelect
              label={labels.inviteRole}
              value={editRole}
              options={editRoleOptions}
              onChange={onEditRoleChange}
            />
            <StaffBranchScopeFields
              allBranches={editScope.allBranches}
              branchIds={editScope.branchIds}
              branchOptions={branchOptions}
              scopeError={editScopeError}
              labels={labels}
              onAllBranchesChange={onEditAllBranchesChange}
              onBranchToggle={onEditBranchToggle}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onEditOpenChange(false);
              }}
            >
              {labels.cancel}
            </Button>
            <Button type="button" disabled={editSubmitting} onClick={onSubmitEdit}>
              {labels.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pinDialogOpen} onOpenChange={onPinDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.pinDialogTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">{pinDialogMemberName}</p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="set-pin">{labels.pinLabel}</Label>
              <Input
                id="set-pin"
                inputMode="numeric"
                autoComplete="off"
                value={pinValue}
                onChange={(e) => {
                  onPinValueChange(e.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-pin-confirm">{labels.pinConfirmLabel}</Label>
              <Input
                id="set-pin-confirm"
                inputMode="numeric"
                autoComplete="off"
                value={pinConfirm}
                onChange={(e) => {
                  onPinConfirmChange(e.target.value);
                }}
              />
              {pinFormError ? <p className="text-destructive text-sm">{pinFormError}</p> : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onPinDialogOpenChange(false);
              }}
            >
              {labels.cancel}
            </Button>
            <Button type="button" disabled={pinSubmitting} onClick={onSubmitPinDialog}>
              {labels.setPin}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removePinOpen}
        onOpenChange={onRemovePinOpenChange}
        title={labels.removePinDialogTitle}
        description={removePinMemberName}
        confirmLabel={labels.removePin}
        cancelLabel={labels.cancel}
        variant="destructive"
        isConfirming={removePinSubmitting}
        onConfirm={() => {
          onConfirmRemovePin();
        }}
      />

      <ConfirmDialog
        open={disableConfirmOpen}
        onOpenChange={onDisableConfirmOpenChange}
        title={labels.disableDialogTitle}
        description={`${labels.disableDialogDescription} ${disableMemberName}`}
        confirmLabel={labels.disable}
        cancelLabel={labels.cancel}
        variant="destructive"
        isConfirming={disableConfirmSubmitting}
        onConfirm={() => {
          onConfirmDisable();
        }}
      />

      <ConfirmDialog
        open={revokeConfirmOpen}
        onOpenChange={onRevokeConfirmOpenChange}
        title={labels.revokeDialogTitle}
        description={`${labels.revokeDialogDescription} ${revokeMemberName}`}
        confirmLabel={labels.revokeInvite}
        cancelLabel={labels.cancel}
        variant="destructive"
        isConfirming={revokeConfirmSubmitting}
        onConfirm={() => {
          onConfirmRevoke();
        }}
      />

      <Dialog open={inviteLinkOpen} onOpenChange={onInviteLinkOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.inviteLinkDialogTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">{labels.inviteLinkValidFor}</p>
          <Input readOnly value={inviteLinkUrl} className="font-mono text-xs" />
          {inviteLinkCopyLabel ? <p className="text-muted-foreground text-sm">{inviteLinkCopyLabel}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onInviteLinkOpenChange(false);
              }}
            >
              {labels.cancel}
            </Button>
            <Button type="button" onClick={onCopyInviteLink}>
              {labels.inviteLinkCopy}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
