import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { BranchSettingsPageView } from './BranchSettingsPageView.js';
import type { BranchSettingsPageViewModel } from '../hooks/use-branch-settings-page.js';

function minimalBranchVm(
  overrides: Partial<BranchSettingsPageViewModel> = {},
): BranchSettingsPageViewModel {
  return {
    redirectTo: null,
    isLoading: false,
    isError: false,
    branchName: 'Main',
    notFound: false,
    name: 'Main',
    onNameChange: () => {},
    isActive: true,
    onIsActiveChange: () => {},
    payBeforeSend: true,
    onPayBeforeSendChange: () => {},
    acceptsCard: false,
    onAcceptsCardChange: () => {},
    pagerEnabled: false,
    onPagerEnabledChange: () => {},
    pagerPlanAvailable: true,
    displayLink: { visible: false, url: null, busy: false, onCreate: () => {}, onRegenerate: () => {}, onCopy: () => {} },
    taxInclusive: false,
    onTaxInclusiveChange: () => {},
    dayStartHour: '4',
    onDayStartHourChange: () => {},
    uiLocale: 'en',
    dayStartGroups: [{ label: 'Night', hours: [0, 4] }],
    timezone: 'Asia/Riyadh',
    onTimezoneChange: () => {},
    timezoneQuery: '',
    onTimezoneQueryChange: () => {},
    timezoneOptions: ['Asia/Riyadh'],
    taxPercent: '15',
    onTaxPercentChange: () => {},
    taxError: null,
    address: '',
    onAddressChange: () => {},
    receiptHeader: '',
    onReceiptHeaderChange: () => {},
    receiptFooter: '',
    onReceiptFooterChange: () => {},
    receiptPreviewHtml: '<p>preview</p>',
    currency: 'SAR',
    dirty: false,
    saving: false,
    onSave: () => {},
    labels: {
      generalSection: 'General',
      nameLabel: 'Name',
      activeLabel: 'Active',
      activeHint: 'Hint',
      back: 'Back',
      notFound: 'Not found',
      taxSection: 'Tax',
      taxSectionHint: 'Hint',
      paymentsSection: 'Payments',
      paymentsSectionHint: 'Hint',
      advancedTitle: 'Advanced',
      advancedHint: 'Hint',
      businessDaySection: 'Business day',
      receiptSection: 'Receipt',
      receiptSectionHint: 'Hint',
      title: 'Branch settings',
      description: 'Payment options',
      payBeforeSend: 'Pay before send',
      payBeforeSendHint: 'Hint',
      acceptsCard: 'Accept card',
      acceptsCardHint: 'Hint',
      pager: 'Pager',
      pagerHint: 'Hint',
      pagerPlanHint: 'Plan',
      pagerDisplayLink: 'Link',
      pagerLinkHint: 'Hint',
      pagerLinkCreate: 'Create link',
      pagerLinkCopy: 'Copy link',
      pagerLinkRegenerate: 'New link',
      taxPercent: 'Tax',
      taxPercentHint: 'Hint',
      taxInclusive: 'Inclusive',
      taxInclusiveHint: 'Hint',
      dayStartHour: 'Day start',
      dayStartHourHint: 'Hint',
      timezone: 'Timezone',
      address: 'Address',
      receiptHeader: 'Header',
      receiptFooter: 'Footer',
      receiptPreview: 'Preview',
      taxDayNote: 'Note',
      save: 'Save',
      loadError: 'Error',
      loading: 'Loading',
      unsavedChanges: 'Unsaved changes',
    },
    ...overrides,
  };
}

describe('BranchSettingsPageView', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders 7c payment switches with current values', () => {
    render(
      <MemoryRouter>
        <BranchSettingsPageView {...minimalBranchVm()} />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Pay before send')).toBeChecked();
    expect(screen.getByLabelText('Accept card')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('shows the unsaved changes alert only while the form is dirty', () => {
    const { rerender } = render(
      <MemoryRouter>
        <BranchSettingsPageView {...minimalBranchVm()} />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Unsaved changes')).toBeNull();
    rerender(
      <MemoryRouter>
        <BranchSettingsPageView {...minimalBranchVm({ dirty: true })} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });
  it('offers to create the ready-screen link when none exists', () => {
    const vm = minimalBranchVm();
    render(
      <MemoryRouter>
        <BranchSettingsPageView
          {...vm}
          displayLink={{ ...vm.displayLink, visible: true, url: null }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Create link' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy link' })).toBeNull();
  });

  it('shows the secret link with copy and regenerate when it exists', () => {
    const vm = minimalBranchVm();
    render(
      <MemoryRouter>
        <BranchSettingsPageView
          {...vm}
          displayLink={{ ...vm.displayLink, visible: true, url: 'https://x/display/TOKEN' }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByDisplayValue('https://x/display/TOKEN')).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New link' })).toBeInTheDocument();
  });
});
