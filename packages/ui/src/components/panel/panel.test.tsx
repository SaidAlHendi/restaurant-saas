import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OpsRow } from '../ops-row/index.js';
import { RankedRow } from '../ranked-row/index.js';
import { SegmentedControl } from '../segmented-control/index.js';
import { Panel, PanelHeader } from './panel.js';

afterEach(cleanup);

describe('dashboard building blocks', () => {
  it('renders a panel with title, description and action', () => {
    render(
      <Panel>
        <PanelHeader title="Recent" description="Latest" action={<button type="button">All</button>} />
      </Panel>,
    );
    expect(screen.getByRole('heading', { name: 'Recent' })).toBeInTheDocument();
    expect(screen.getByText('Latest')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
  });

  it('renders ranked and ops rows', () => {
    render(
      <>
        <RankedRow rank={2} title="Latte" count="5" amount="SAR 20" />
        <OpsRow icon={<span />} title="Open" hint="now" value="3" />
      </>,
    );
    expect(screen.getByText('Latte')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('segmented control marks the active option and reports changes', () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedControl
        label="Order type"
        value="a"
        onValueChange={onValueChange}
        options={[
          { value: 'a', label: 'Dine in' },
          { value: 'b', label: 'Takeaway' },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Dine in' })).toHaveAttribute('aria-pressed', 'true');
    screen.getByRole('button', { name: 'Takeaway' }).click();
    expect(onValueChange).toHaveBeenCalledWith('b');
  });
});
