import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DEFAULT_MENU_THEME, type MenuTheme } from '@app/shared';

import { MenuLookPreview } from './MenuLookPreview.js';

const base = {
  locale: 'en' as const,
  restaurantName: 'Sahtain Grill',
  categories: ['Starters'],
  dishes: [{ id: '1', name: 'Soup', description: 'Fresh', price: '12.00' }],
  searchPlaceholder: 'Search the menu',
  label: 'Preview',
};

function theme(patch: Partial<MenuTheme>): MenuTheme {
  return { ...DEFAULT_MENU_THEME, ...patch };
}

describe('MenuLookPreview', () => {
  it('shows the restaurant name and no search box by default', () => {
    render(<MenuLookPreview {...base} theme={DEFAULT_MENU_THEME} />);
    expect(screen.getByText('Sahtain Grill')).toBeInTheDocument();
    expect(screen.queryByText('Search the menu')).not.toBeInTheDocument();
  });

  it('shows the search box when enabled', () => {
    render(<MenuLookPreview {...base} theme={theme({ showSearch: true })} />);
    expect(screen.getByText('Search the menu')).toBeInTheDocument();
  });

  it('shows the headline in the preview language and falls back to the other language', () => {
    const hero = {
      enabled: true,
      headline: { en: 'Welcome', ar: 'أهلاً' },
      subline: { en: 'Eat well' },
    };
    const { rerender } = render(<MenuLookPreview {...base} theme={theme({ hero })} />);
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    rerender(<MenuLookPreview {...base} locale="ar" theme={theme({ hero })} />);
    expect(screen.getByText('أهلاً')).toBeInTheDocument();
    expect(screen.getByText('Eat well')).toBeInTheDocument();
  });

  const hero = { enabled: true, headline: { en: 'Welcome' }, subline: {} };

  it('shows the cover photo in the hero, and none without a cover', () => {
    const { container, rerender } = render(
      <MenuLookPreview {...base} theme={theme({ hero })} coverUrl="https://cdn.test/cover-480.webp" />,
    );
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn.test/cover-480.webp');
    rerender(<MenuLookPreview {...base} theme={theme({ hero })} coverUrl={null} />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('hides the cover while the hero is off', () => {
    const { container } = render(
      <MenuLookPreview {...base} theme={DEFAULT_MENU_THEME} coverUrl="https://cdn.test/c.webp" />,
    );
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows the closing line in the preview language, with fallback', () => {
    const closingLine = { en: 'See you soon', ar: 'نراكم قريباً' };
    const { rerender } = render(<MenuLookPreview {...base} theme={theme({ closingLine })} />);
    expect(screen.getByText('See you soon')).toBeInTheDocument();
    rerender(<MenuLookPreview {...base} locale="ar" theme={theme({ closingLine })} />);
    expect(screen.getByText('نراكم قريباً')).toBeInTheDocument();
  });

  it('shows no footer without a closing line', () => {
    const { container } = render(<MenuLookPreview {...base} theme={DEFAULT_MENU_THEME} />);
    expect(container.querySelector('footer')).toBeNull();
  });

  it('draws the brand colour as primary with readable text, like the public menu', () => {
    const { container } = render(
      <MenuLookPreview {...base} theme={theme({ preset: 'forest', brandColor: '#8a1c1c' })} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--primary')).toBe('#8a1c1c');
    expect(root.style.getPropertyValue('--primary-foreground')).toBe('#ffffff');
  });

  it('darkens a brand colour that is too pale for the background', () => {
    const { container } = render(
      <MenuLookPreview {...base} theme={theme({ preset: 'forest', brandColor: '#f0e6c8' })} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--primary')).not.toBe('#f0e6c8');
  });
});
