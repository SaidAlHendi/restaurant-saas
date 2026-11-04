import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BannerAlert } from './banner-alert.js';

afterEach(cleanup);

describe('BannerAlert', () => {
  it('shows the message and fires the action', () => {
    const onAction = vi.fn();
    render(
      <BannerAlert
        variant="warning"
        message="Trial ends"
        actionLabel="Choose plan"
        onAction={onAction}
      />,
    );
    expect(screen.getByRole('status').textContent).toContain('Trial ends');
    fireEvent.click(screen.getByRole('button', { name: 'Choose plan' }));
    expect(onAction).toHaveBeenCalledOnce();
  });
});
