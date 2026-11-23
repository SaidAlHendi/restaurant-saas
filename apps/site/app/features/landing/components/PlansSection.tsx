import { cn } from '@app/ui';

import type { LandingContent, PlanKey } from '../content/types.js';
import { servicesOfPlan, type PlanTableRow, type PlanView } from '../landing.utils.js';
import { Tile, type TileTone } from './Tile.js';

export type PlansSectionProps = {
  content: LandingContent['plans'];
  plans: PlanView[];
  table: PlanTableRow[];
};

const PLAN_TONE: Record<PlanKey, TileTone> = {
  free: 'paper',
  menu: 'accent',
  restaurant: 'brand',
  business: 'highlight',
};

type ServiceProps = { label: string; value: string | null; soonLabel?: string };

function Service({ label, value, soonLabel }: ServiceProps) {
  const soon = soonLabel !== undefined;
  return (
    <li
      className={cn(
        'flex items-baseline gap-2.5 border-b border-dashed border-current/25 py-2.5 text-[15px] leading-6',
        soon && 'opacity-80',
      )}
    >
      <span aria-hidden className={cn('w-3.5 shrink-0', soon ? 'opacity-70' : 'font-bold')}>
        {soon ? '○' : '✓'}
      </span>
      <span className="flex-1">
        {label}
        {soon ? (
          <span className="ms-2 inline-block rounded-md bg-current/15 px-1.5 py-0.5 align-middle text-xs font-semibold leading-4">
            {soonLabel}
          </span>
        ) : null}
      </span>
      {value !== null ? <span className="font-semibold">{value}</span> : null}
    </li>
  );
}

/** Four plan tickets with the same torn top edge as the kitchen tickets and the hero tile. */
export function PlansSection({ content, plans, table }: PlansSectionProps) {
  return (
    <>
      <section className="col-span-12 px-1 pt-6 pb-2 text-background md:px-3 md:pt-12 md:pb-4">
        <h1 className="lp-display lp-stm">{content.title}</h1>
        <p className="mt-3 max-w-[34em] text-base opacity-75 md:text-lg">{content.lead}</p>
      </section>
      {plans.map((plan) => {
        const services = servicesOfPlan(table, plan.key);
        return (
          <Tile
            key={plan.key}
            as="article"
            tone={PLAN_TONE[plan.key]}
            className="lp-torn justify-start gap-6 md:col-span-6 lg:col-span-3"
          >
            <div>
              <div className="mb-3 h-7">
                {plan.highlight ? (
                  <span className="inline-block rounded-full bg-primary-foreground px-3 py-1 text-xs font-bold text-primary">
                    {content.recommendedLabel}
                  </span>
                ) : null}
              </div>
              <h3 className="lp-display lp-med">{plan.name}</h3>
              <p className="lp-display lp-price">{plan.price}</p>
              <p className="mt-1 min-h-6 text-sm opacity-90">{plan.unit}</p>
            </div>
            <ul className="list-none p-0">
              {services
                .filter((service) => !service.soon)
                .map((service) => (
                  <Service key={service.key} label={service.label} value={service.value} />
                ))}
              {services
                .filter((service) => service.soon)
                .map((service) => (
                  <Service
                    key={service.key}
                    label={service.label}
                    value={service.value}
                    soonLabel={content.soonLabel}
                  />
                ))}
            </ul>
          </Tile>
        );
      })}
    </>
  );
}
