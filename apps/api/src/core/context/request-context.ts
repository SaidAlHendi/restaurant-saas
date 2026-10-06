export interface RequestContext {
  orgId: string;
  membershipId?: string;
  branchIds: string[];
  permissions: string[];
  deviceId?: string;
  userId?: string;
}
