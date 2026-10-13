import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BranchSettingsPageView } from './BranchSettingsPageView.js';
import type { BranchSettingsPageViewModel } from '../hooks/use-branch-settings-page.js';

function minimalBranchVm(
  overrides: Partial<BranchSettingsPageViewModel> = {},
): BranchSettingsPageViewModel {
  return {
    isLoading: false,
    isError: false,
    branchName: 'Main',
    payBeforeSend: true,
    onPayBeforeSendChange: () => {},
    acceptsCard: false,
    onAcceptsCardChange: () => {},
    taxInclusive: false,
    onTaxInclusiveChange: () => {},
    dayStartHour: '4',
    onDayStartHourChange: () => {},
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
      title: 'Branch settings',
      description: 'Payment options',
      payBeforeSend: 'Pay before send',
      payBeforeSendHint: 'Hint',
      acceptsCard: 'Accept card',
      acceptsCardHint: 'Hint',
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
    },
    ...overrides,
  };
}

describe('BranchSettingsPageView', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders 7c payment switches with current values', () => {
    render(<BranchSettingsPageView {...minimalBranchVm()} />);
    expect(screen.getByLabelText('Pay before send')).toBeChecked();
    expect(screen.getByLabelText('Accept card')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
