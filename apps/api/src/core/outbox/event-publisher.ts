export type OutboxEventRow = {
  id: string;
  orgId: string;
  branchId: string | null;
  type: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  attempts: number;
};

export interface EventPublisher {
  publish(event: OutboxEventRow): Promise<void>;
}

export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');
