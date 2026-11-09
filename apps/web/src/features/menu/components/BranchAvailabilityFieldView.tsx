import { Checkbox, FormItem, FormLabel } from '@app/ui';

import type { BranchAvailabilityValues } from '../branch-availability.utils.js';
import { toggleBranchId } from '../branch-availability.utils.js';

export interface BranchAvailabilityFieldViewProps {
  label: string;
  hint: string;
  allBranchesLabel: string;
  branches: { id: string; name: string }[];
  /** Offers "All branches". Staff limited to some branches only pick from their own. */
  canChooseAll: boolean;
  value: BranchAvailabilityValues;
  onChange: (value: BranchAvailabilityValues) => void;
  disabled?: boolean;
  error?: string | undefined;
}

export function BranchAvailabilityFieldView({
  label,
  hint,
  allBranchesLabel,
  branches,
  canChooseAll,
  value,
  onChange,
  disabled = false,
  error,
}: BranchAvailabilityFieldViewProps) {
  const listDisabled = disabled || (canChooseAll && value.availableInAllBranches);
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <p className="text-muted-foreground text-sm">{hint}</p>
      <div className="flex flex-col gap-2">
        {canChooseAll ? (
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={value.availableInAllBranches}
              disabled={disabled}
              onCheckedChange={(checked) => {
                const all = checked === true;
                onChange({
                  availableInAllBranches: all,
                  // Leaving "All branches" starts from every branch ticked, so unticking is quick.
                  branchIds:
                    !all && value.branchIds.length === 0
                      ? branches.map((branch) => branch.id)
                      : value.branchIds,
                });
              }}
            />
            {allBranchesLabel}
          </label>
        ) : null}
        {branches.map((branch) => (
          <label key={branch.id} className="flex items-center gap-2 text-sm ps-6">
            <Checkbox
              checked={value.availableInAllBranches || value.branchIds.includes(branch.id)}
              disabled={listDisabled}
              onCheckedChange={(checked) => {
                onChange({
                  ...value,
                  branchIds: toggleBranchId(value.branchIds, branch.id, checked === true),
                });
              }}
            />
            {branch.name}
          </label>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </FormItem>
  );
}
