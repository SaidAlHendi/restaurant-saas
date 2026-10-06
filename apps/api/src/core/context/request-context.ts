export interface RequestContext {
  userId: string;
  orgId: string;
  membershipId: string;
  sessionId: string;
  branchIds: string[];
  allBranches: boolean;
  permissions: string[];
  currentBranchId?: string;
}

export const REQUEST_CONTEXT_KEY = 'requestContext';
