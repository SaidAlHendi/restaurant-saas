export function branchPreferenceStorageKey(orgId: string): string {
  return `rs.branch.${orgId}`;
}

export function readStoredBranchId(orgId: string): string | null {
  try {
    return localStorage.getItem(branchPreferenceStorageKey(orgId));
  } catch {
    return null;
  }
}

export function writeStoredBranchId(orgId: string, branchId: string): void {
  try {
    localStorage.setItem(branchPreferenceStorageKey(orgId), branchId);
  } catch {
    // ignore quota / private mode
  }
}

export function pickCurrentBranchId(input: {
  meCurrentBranchId: string | null;
  branches: Array<{ id: string }>;
  previousBranchId: string | null;
  storedBranchId: string | null;
}): string | null {
  const { meCurrentBranchId, branches, previousBranchId, storedBranchId } = input;
  const isMember = (id: string) => branches.some((b) => b.id === id);

  if (meCurrentBranchId !== null && isMember(meCurrentBranchId)) {
    return meCurrentBranchId;
  }
  if (storedBranchId !== null && isMember(storedBranchId)) {
    return storedBranchId;
  }
  if (previousBranchId !== null && isMember(previousBranchId)) {
    return previousBranchId;
  }
  return branches[0]?.id ?? null;
}
