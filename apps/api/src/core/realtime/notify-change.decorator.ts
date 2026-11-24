import { SetMetadata } from '@nestjs/common';
import type { DataChangedScope } from '@app/shared';

export const NOTIFY_CHANGE_KEY = 'notifyChange';

export type NotifyChangeOptions = {
  scope: DataChangedScope;
  /** Where the organization id comes from: the signed-in tenant user (default) or the `:id` route param (platform admin routes). */
  org?: 'ctx' | 'param:id';
  /** Platform admin took access away (suspend/cancel): drop every open screen instead of notifying. */
  kick?: boolean;
};

/**
 * After this handler succeeds, tell the restaurant's open screens that `scope` changed.
 * One decorator per write endpoint keeps the "who must be told" rule next to the route.
 */
export const NotifyChange = (scope: DataChangedScope, options: Omit<NotifyChangeOptions, 'scope'> = {}) =>
  SetMetadata(NOTIFY_CHANGE_KEY, { scope, ...options } satisfies NotifyChangeOptions);
