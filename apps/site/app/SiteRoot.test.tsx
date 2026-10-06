import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home from './routes/home.js';

describe('Site root', () => {
  it('renders home page heading', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /restaurant saas/i })).toBeInTheDocument();
  });
});
