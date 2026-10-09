import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { beforeAll, describe, expect, it } from 'vitest';

import { baseApi } from '../../../app/api/base-api.js';
import { sessionReducer } from '../../../features/session/session.slice.js';
import { initI18n, i18n } from '../../../lib/i18n.js';
import { localizedFormToApi } from '../menu.utils.js';
import {
  buildProductFormDefaultValues,
  buildProductFormSchema,
  useProductForm,
  type ProductFormOutput,
} from './use-product-form.js';

const categoryId = '01934567-89ab-7cde-b012-3456789abcde';
const priceRequiredMessage = 'Enter a price';

function createTestStore() {
  return configureStore({
    reducer: {
      session: sessionReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  });
}

function createWrapper() {
  const store = createTestStore();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
      </Provider>
    );
  };
}

describe('buildProductFormSchema', () => {
  it('maps localized name fields to API body shape', () => {
    const parsed = buildProductFormSchema(['en', 'ar'], 'en', [categoryId], priceRequiredMessage).parse(
      {
        categoryId,
        name: { en: 'Burger', ar: 'برجر' },
        description: { en: '', ar: '' },
        priceMinor: 1500,
        isActive: true,
        modifierGroupIds: [],
      },
    );

    const org = { defaultLocale: 'en', locales: ['en', 'ar'] as string[] };
    expect(localizedFormToApi(parsed.name, org)).toEqual({ en: 'Burger', ar: 'برجر' });
    expect(parsed.priceMinor).toBe(1500);
  });

  it('rejects null, negative and non-integer prices', () => {
    const schema = buildProductFormSchema(['en'], 'en', [categoryId], priceRequiredMessage);
    expect(() =>
      schema.parse({
        categoryId,
        name: { en: 'Tea' },
        description: { en: '' },
        priceMinor: null,
        isActive: true,
        modifierGroupIds: [],
      }),
    ).toThrow();
    expect(() =>
      schema.parse({
        categoryId,
        name: { en: 'Tea' },
        description: { en: '' },
        priceMinor: -1,
        isActive: true,
        modifierGroupIds: [],
      }),
    ).toThrow();
    expect(() =>
      schema.parse({
        categoryId,
        name: { en: 'Tea' },
        description: { en: '' },
        priceMinor: 10.5,
        isActive: true,
        modifierGroupIds: [],
      }),
    ).toThrow();
  });

  it('keeps price in integer minor units', () => {
    const parsed = buildProductFormSchema(['en'], 'en', [categoryId], priceRequiredMessage).parse({
      categoryId,
      name: { en: 'Tea' },
      description: { en: '' },
      priceMinor: 1250,
      isActive: true,
      modifierGroupIds: [],
    });
    expect(parsed.priceMinor).toBe(1250);
  });

  it('requires default locale name', () => {
    expect(() =>
      buildProductFormSchema(['en', 'ar'], 'en', [categoryId], priceRequiredMessage).parse({
        categoryId,
        name: { en: '', ar: 'x' },
        description: { en: '', ar: '' },
        priceMinor: 0,
        isActive: true,
        modifierGroupIds: [],
      }),
    ).toThrow();
  });
});

describe('buildProductFormDefaultValues', () => {
  it('starts with empty price for new products', () => {
    const defaults = buildProductFormDefaultValues(undefined, [categoryId], ['en', 'ar']);
    expect(defaults.priceMinor).toBeNull();
  });
});

describe('useProductForm', () => {
  beforeAll(async () => {
    await initI18n();
  });

  it('keeps typed name and price across categoryIds rerender and submit', async () => {
    const wrapper = createWrapper();

    const { result, rerender } = renderHook(
      (props: { categoryIds: string[] }) =>
        useProductForm({
          product: undefined,
          categoryIds: props.categoryIds,
          open: true,
        }),
      { wrapper, initialProps: { categoryIds: [categoryId] } },
    );

    act(() => {
      result.current.form.setValue('name.en', 'Burger');
      result.current.form.setValue('priceMinor', 1500);
    });

    rerender({ categoryIds: [categoryId] });

    expect(result.current.form.getValues('name.en')).toBe('Burger');
    expect(result.current.form.getValues('priceMinor')).toBe(1500);

    let submitted: ProductFormOutput | undefined;
    await act(async () => {
      await result.current.form.handleSubmit((values) => {
        submitted = values;
      })();
    });

    expect(submitted).toBeDefined();
    expect(submitted?.name.en).toBe('Burger');
    expect(submitted?.priceMinor).toBe(1500);

    if (!submitted) {
      throw new Error('expected submit');
    }
    const body = result.current.toCreateBody(submitted);
    expect(body.priceMinor).toBe(1500);
    expect(body.name.en).toBe('Burger');
  });
});
