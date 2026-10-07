import { Injectable } from '@nestjs/common';

@Injectable()
export class EntitlementsService {
  /** TODO roadmap 10: enforce plan_features limits from subscriptions. */
  async assertWithinLimit(_orgId: string, _featureKey: string, _nextValue: number): Promise<void> {
    await Promise.resolve();
  }
}
