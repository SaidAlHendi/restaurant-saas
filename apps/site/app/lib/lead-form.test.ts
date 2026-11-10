import { describe, expect, it } from 'vitest';

import { readLeadForm, validateLeadForm } from './lead-form.js';

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

const valid = {
  name: ' Sara Al-Qahtani ',
  restaurantName: 'Qahwa Cafe',
  phone: '+966 50 123 4567',
  email: 'sara@example.com',
  country: 'SA',
  branches: '2',
  message: '',
};

describe('readLeadForm', () => {
  it('trims values and reads the honeypot', () => {
    const read = readLeadForm(form({ ...valid, website: 'http://spam.example' }));
    expect(read.values.name).toBe('Sara Al-Qahtani');
    expect(read.honeypot).toBe('http://spam.example');
  });

  it('keeps well-formed attribution and drops garbage', () => {
    const ok = readLeadForm(form({ ...valid, attribution: '{"utm_source":"google","landingPath":"/ar"}' }));
    expect(ok.attribution).toEqual({ utm_source: 'google', landingPath: '/ar' });
    expect(readLeadForm(form({ ...valid, attribution: 'not json' })).attribution).toBeUndefined();
    expect(
      readLeadForm(form({ ...valid, attribution: JSON.stringify({ utm_source: 'x'.repeat(500) }) })).attribution,
    ).toBeUndefined();
  });
});

describe('validateLeadForm', () => {
  it('builds the API body from a valid form', () => {
    const result = validateLeadForm(readLeadForm(form(valid)), 'ar');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body).toMatchObject({
        name: 'Sara Al-Qahtani',
        email: 'sara@example.com',
        country: 'SA',
        branches: 2,
        locale: 'ar',
      });
      expect(result.body.message).toBeUndefined();
    }
  });

  it('asks for empty required fields and flags malformed ones', () => {
    const result = validateLeadForm(
      readLeadForm(form({ ...valid, name: '', email: 'nope', branches: '0', country: '' })),
      'en',
    );
    expect(result).toEqual({
      ok: false,
      errors: { name: 'required', email: 'invalid', branches: 'invalid', country: 'required' },
    });
  });

  it('treats an empty branch count as missing', () => {
    const result = validateLeadForm(readLeadForm(form({ ...valid, branches: '' })), 'en');
    expect(result).toMatchObject({ ok: false, errors: { branches: 'required' } });
  });
});
