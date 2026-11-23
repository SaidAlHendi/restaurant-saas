import { useEffect, useState } from 'react';

import { normalizeSearchText } from './normalize-search-text.js';

/** Filters the server-rendered dish rows in place; hides sections that end up empty. */
function applySearch(query: string): void {
  const q = normalizeSearchText(query);
  let visible = 0;
  for (const section of document.querySelectorAll<HTMLElement>('[data-menu-section]')) {
    let inSection = 0;
    for (const item of section.querySelectorAll<HTMLElement>('[data-menu-item]')) {
      const match = q === '' || normalizeSearchText(item.dataset.search ?? '').includes(q);
      item.hidden = !match;
      if (match) {
        inSection += 1;
      }
    }
    section.hidden = inSection === 0;
    // Keep the category pills in step: no pill for a section the search emptied.
    for (const chip of document.querySelectorAll<HTMLElement>('[data-menu-chip]')) {
      if (chip.getAttribute('href') === `#${section.id}`) {
        chip.hidden = inSection === 0;
      }
    }
    visible += inSection;
  }
  const empty = document.getElementById('menu-no-results');
  if (empty) {
    empty.hidden = visible > 0;
  }
}

export function MenuSearch({ locale }: { locale: 'ar' | 'en' }) {
  const [value, setValue] = useState('');
  const label = locale === 'ar' ? 'ابحث في القائمة' : 'Search the menu';

  // The rows are filtered through the DOM, so re-sync them with the box on every mount and change:
  // a remounted input starts empty and must not leave rows hidden.
  useEffect(() => {
    applySearch(value);
  }, [value]);

  return (
    <input
      type="search"
      value={value}
      aria-label={label}
      placeholder={label}
      onChange={(e) => {
        setValue(e.target.value);
      }}
      className="w-full rounded-full bg-muted px-5 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
    />
  );
}
