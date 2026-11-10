import type { LandingPageViewModel } from '../hooks/use-landing-page.js';
import type { PlanKey } from '../content/types.js';
import { Tile, type TileTone } from './Tile.js';

export type PlansSectionProps = {
  title: string;
  plans: LandingPageViewModel['plans'];
};

const PLAN_TONE: Record<PlanKey, TileTone> = {
  free: 'paper',
  menu: 'accent',
  restaurant: 'brand',
  business: 'highlight',
};

/** Real plans and prices (Free $0, Menu $12, Restaurant $39 per branch, Business $79 per branch). */
export function PlansSection({ title, plans }: PlansSectionProps) {
  return (
    <>
      <Tile as="section" tone="paper" id="plans" className="md:min-h-[200px]">
        <h2 className="lp-display lp-stm">{title}</h2>
      </Tile>
      {plans.map((plan) => (
        <Tile
          key={plan.key}
          as="article"
          tone={PLAN_TONE[plan.key]}
          className="col-span-6 md:col-span-3 md:min-h-[420px]"
        >
          <div>
            <h3 className="lp-display lp-med">{plan.name}</h3>
            <p className="lp-display lp-price">
              {plan.price}
              {plan.unit ? <small className="ms-1.5 font-[family-name:var(--lp-text)] text-sm opacity-90">{plan.unit}</small> : null}
            </p>
          </div>
          <ul className="list-none p-0 text-[15.5px] leading-7">
            {plan.features.map((feature) => (
              <li key={feature} className="lp-check">
                {feature}
              </li>
            ))}
          </ul>
        </Tile>
      ))}
    </>
  );
}
