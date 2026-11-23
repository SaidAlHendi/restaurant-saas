import type { PlanKey } from '../content/types.js';
import type { PlanView } from '../landing.utils.js';
import { Tile, type TileTone } from './Tile.js';

export type PlansSectionProps = {
  title: string;
  lead: string;
  recommendedLabel: string;
  soonLabel: string;
  plans: PlanView[];
};

const PLAN_TONE: Record<PlanKey, TileTone> = {
  free: 'paper',
  menu: 'accent',
  restaurant: 'brand',
  business: 'highlight',
};

/** Real plans and prices (Free $0, Menu $12, Restaurant $39 per branch, Business $79 per branch). */
export function PlansSection({ title, lead, recommendedLabel, soonLabel, plans }: PlansSectionProps) {
  return (
    <>
      <Tile as="section" tone="paper" className="md:min-h-[200px]">
        <h1 className="lp-display lp-stm">{title}</h1>
        <p className="max-w-[36em] text-base text-foreground/75">{lead}</p>
      </Tile>
      {plans.map((plan) => (
        <Tile
          key={plan.key}
          as="article"
          tone={PLAN_TONE[plan.key]}
          className="col-span-6 justify-start gap-8 md:col-span-3 md:min-h-[420px]"
        >
          <div>
            {plan.highlight ? (
              <span className="mb-2 inline-block rounded-full bg-primary-foreground px-3 py-1 text-xs font-bold text-primary">
                {recommendedLabel}
              </span>
            ) : null}
            <h3 className="lp-display lp-med">{plan.name}</h3>
            <p className="lp-display lp-price">
              {plan.price}
              {plan.unit ? <small className="ms-1.5 font-[family-name:var(--lp-text)] text-sm opacity-90">{plan.unit}</small> : null}
            </p>
          </div>
          <ul className="list-none p-0 text-[15.5px] leading-7">
            {plan.features.map((feature) => (
              <li key={feature.text} className={feature.soon ? 'lp-check lp-check-soon opacity-80' : 'lp-check'}>
                {feature.text}
                {feature.soon ? (
                  <span className="ms-2 inline-block rounded-md bg-current/15 px-1.5 py-0.5 align-middle text-xs font-semibold leading-4">
                    {soonLabel}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Tile>
      ))}
    </>
  );
}
