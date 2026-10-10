import { SetMetadata } from '@nestjs/common';

export const BRANCH_SCOPE_KEY = 'branchScope';

/** Route must include `:branchId`; returns 404 when not in ctx.branchIds. */
export const RequireBranchScope = () => SetMetadata(BRANCH_SCOPE_KEY, true);
