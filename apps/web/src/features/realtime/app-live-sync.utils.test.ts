import { DATA_CHANGED_SCOPES } from '@app/shared';
import { describe, expect, it } from 'vitest';

import { SCOPE_TAGS, SESSION_SCOPES } from './app-live-sync.utils.js';

describe('app live sync scopes', () => {
  it('maps every server scope to at least one tag to refetch', () => {
    for (const scope of DATA_CHANGED_SCOPES) {
      expect(SCOPE_TAGS[scope].length).toBeGreaterThan(0);
    }
  });

  it('re-reads the session for scopes that change permissions, branches or plan', () => {
    expect(SESSION_SCOPES).toEqual(expect.arrayContaining(['staff', 'plan', 'branch', 'settings']));
  });
});
