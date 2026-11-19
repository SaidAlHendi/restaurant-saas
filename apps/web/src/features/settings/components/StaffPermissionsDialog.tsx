import {
  useStaffPermissionsDialog,
  type StaffPermissionsMember,
} from '../hooks/use-staff-permissions-dialog.js';
import { StaffPermissionsDialogView } from './StaffPermissionsDialogView.js';

type Props = {
  member: StaffPermissionsMember;
  onClose: () => void;
};

/** Mounted only while a member is selected, so each opening starts from the saved state. */
export function StaffPermissionsDialog({ member, onClose }: Props) {
  const vm = useStaffPermissionsDialog(member, onClose);
  return (
    <StaffPermissionsDialogView
      {...vm}
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    />
  );
}
