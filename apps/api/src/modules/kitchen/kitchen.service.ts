import { Injectable } from '@nestjs/common';

import type { ChangeOrderItemStatusBody, KitchenBoardResponse } from '@app/shared';

import type { RequestContext } from '../../core/context/request-context';
import { OrderingService } from '../ordering/ordering.service';

@Injectable()
export class KitchenService {
  constructor(private readonly ordering: OrderingService) {}

  getBoard(ctx: RequestContext, branchId: string): Promise<KitchenBoardResponse> {
    return this.ordering.getKitchenBoard(ctx, branchId);
  }

  changeItemStatus(
    ctx: RequestContext,
    branchId: string,
    orderId: string,
    itemId: string,
    body: ChangeOrderItemStatusBody,
  ) {
    return this.ordering.changeOrderItemStatus(ctx, branchId, orderId, itemId, body);
  }
}
