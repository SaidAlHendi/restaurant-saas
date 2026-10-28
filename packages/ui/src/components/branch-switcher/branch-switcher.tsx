import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../select/index.js';

export type BranchSwitcherOption = {
  id: string;
  name: string;
};

export type BranchSwitcherProps = {
  branches: BranchSwitcherOption[];
  value: string | null;
  onValueChange: (branchId: string) => void;
  ariaLabel: string;
  placeholder: string;
  className?: string;
};

export function BranchSwitcher({
  branches,
  value,
  onValueChange,
  ariaLabel,
  placeholder,
  className,
}: BranchSwitcherProps) {
  if (branches.length === 0) {
    return null;
  }

  if (branches.length === 1) {
    const only = branches[0];
    if (only === undefined) {
      return null;
    }
    return (
      <span
        dir="auto"
        className="text-muted-foreground truncate text-sm font-medium"
        title={only.name}
      >
        {only.name}
      </span>
    );
  }

  const selected = value ?? branches[0]?.id ?? '';

  return (
    <Select value={selected} onValueChange={onValueChange}>
      <SelectTrigger size="sm" className={className} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {branches.map((branch) => (
          <SelectItem key={branch.id} value={branch.id}>
            {branch.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
