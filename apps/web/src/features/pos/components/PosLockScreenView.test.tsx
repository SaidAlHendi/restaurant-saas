import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PosLockScreenView } from './PosLockScreenView.js';
import type { PosLockScreenViewModel } from '../hooks/use-pos-lock-screen.js';

function minimalLockVm(overrides: Partial<PosLockScreenViewModel> = {}): PosLockScreenViewModel {
  return {
    loading: false,
    users: [
      {
        membershipId: '01932a1a-7b3e-7000-8000-000000000050',
        name: 'Cashier One',
        roleLabel: 'Cashier',
        selected: false,
        onSelect: vi.fn(),
      },
      {
        membershipId: '01932a1a-7b3e-7000-8000-000000000051',
        name: 'Manager Two',
        roleLabel: 'Manager',
        selected: true,
        onSelect: vi.fn(),
      },
    ],
    pinPad: {
      digits: '12',
      canSubmit: false,
      onDigit: vi.fn(),
      onBackspace: vi.fn(),
      onSubmit: vi.fn(),
      submitting: false,
    },
    errorMessage: null,
    lockCountdown: null,
    labels: {
      title: 'Enter PIN',
      subtitle: 'Sign in',
      pickUser: 'Pick user',
      emptyUsers: 'No users',
      backspace: 'Back',
      submit: 'Unlock',
      locked: 'Wait',
      loading: 'Loading',
    },
    ...overrides,
  };
}

describe('PosLockScreenView', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders pin users from view model', () => {
    render(<PosLockScreenView {...minimalLockVm()} />);
    expect(screen.getByText('Cashier One')).toBeInTheDocument();
    expect(screen.getByText('Manager Two')).toBeInTheDocument();
    expect(screen.getByText('Enter PIN')).toBeInTheDocument();
  });
});
