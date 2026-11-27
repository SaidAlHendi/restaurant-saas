import { CircleCheckIcon, CircleDashedIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import type { AdminOrgDetail } from '@app/shared';
import { cn } from '@app/ui';

import { Section } from './DetailField.js';
import type { RestaurantDetailVm } from './use-restaurant-detail-page.js';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-medium">{children}</dd>
    </div>
  );
}

export function OverviewTab({
  vm,
  restaurant,
}: {
  vm: RestaurantDetailVm;
  restaurant: AdminOrgDetail;
}) {
  const { t, setup } = vm;
  const none = <span className="font-normal text-muted-foreground">{t('restaurants.none')}</span>;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Section title={t('restaurants.sections.setup')}>
        <p className="mb-3 text-sm text-muted-foreground">
          {t('restaurants.setup.progress', {
            done: vm.formatNumber(setup.done),
            total: vm.formatNumber(setup.steps.length),
          })}
        </p>
        <div aria-hidden className="mb-4 flex gap-1">
          {setup.steps.map((step, index) => (
            <span
              key={step.key}
              className={cn(
                'h-2 flex-1 rounded-full',
                index < setup.done ? 'bg-success' : 'bg-muted',
              )}
            />
          ))}
        </div>
        <ul className="divide-y">
          {setup.steps.map((step) => (
            <li key={step.key} className="flex items-center gap-3 py-2.5">
              {step.count > 0 ? (
                <CircleCheckIcon className="size-5 shrink-0 text-success" aria-hidden />
              ) : (
                <CircleDashedIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className={cn('flex-1', step.count === 0 && 'text-muted-foreground')}>
                {t(`restaurants.setup.${step.key}`)}
              </span>
              <span className="font-semibold tabular-nums">
                {step.count > 0 ? vm.formatNumber(step.count) : t('restaurants.setup.missing')}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('restaurants.sections.settings')}>
        <dl className="divide-y">
          <Row label={t('restaurants.fields.ownerName')}>{restaurant.ownerName ?? none}</Row>
          <Row label={t('restaurants.fields.ownerEmail')}>
            {restaurant.ownerEmail ? (
              <a className="hover:underline" dir="ltr" href={`mailto:${restaurant.ownerEmail}`}>
                {restaurant.ownerEmail}
              </a>
            ) : (
              none
            )}
          </Row>
          <Row label={t('restaurants.fields.slug')}>
            <span dir="ltr">{restaurant.slug}</span>
          </Row>
          <Row label={t('restaurants.fields.country')}>{vm.countryName(restaurant.country)}</Row>
          <Row label={t('restaurants.fields.currency')}>{restaurant.defaultCurrency}</Row>
          <Row label={t('restaurants.fields.displayCurrency')}>
            {restaurant.displayCurrency && restaurant.exchangeRate
              ? t('restaurants.fields.exchangeRate', {
                  rate: vm.formatNumber(restaurant.exchangeRate),
                  display: restaurant.displayCurrency,
                  base: restaurant.defaultCurrency,
                })
              : (restaurant.displayCurrency ?? none)}
          </Row>
          <Row label={t('restaurants.fields.locale')}>
            {vm.languageName(restaurant.defaultLocale)}
          </Row>
          <Row label={t('restaurants.fields.languages')}>
            {restaurant.locales.map(vm.languageName).join(' / ')}
          </Row>
          <Row label={t('restaurants.fields.created')}>{vm.formatDate(restaurant.createdAt)}</Row>
        </dl>
      </Section>
    </div>
  );
}
