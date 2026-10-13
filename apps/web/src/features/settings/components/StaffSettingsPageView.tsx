import {
  Badge,
  Button,
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
} from '@app/ui';

import type { StaffSettingsPageViewModel } from '../hooks/use-staff-settings-page.js';

export function StaffSettingsPageView(props: StaffSettingsPageViewModel) {
  const {
    isLoading,
    isError,
    rows,
    canAddStaff,
    inviteOpen,
    onInviteOpenChange,
    inviteEmail,
    onInviteEmailChange,
    inviteRole,
    onInviteRoleChange,
    inviteSubmitting,
    onSubmitInvite,
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
          <Button
            type="button"
            onClick={() => {
              onInviteOpenChange(true);
            }}
          >
            {labels.addStaff}
          </Button>
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
            row.onDisable ?? row.onEnable ?? row.onRegenerateInvite ?? row.onRevokeInvite;
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
        <DialogContent>
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
            </div>
            <div className="space-y-2">
              <Label>{labels.inviteRole}</Label>
              <Select
                value={inviteRole}
                onValueChange={(value) => {
                  onInviteRoleChange(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">{labels.roleCashier}</SelectItem>
                  <SelectItem value="kitchen">{labels.roleKitchen}</SelectItem>
                  <SelectItem value="manager">{labels.roleManager}</SelectItem>
                  <SelectItem value="owner">{labels.roleOwner}</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
    </div>
  );
}
