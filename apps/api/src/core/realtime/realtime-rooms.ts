/** Realtime namespace shared by the gateway, the outbox publisher and kicks. */
export const REALTIME_NAMESPACE = '/rt';

export function branchRoom(branchId: string): string {
  return `branch:${branchId}`;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}
