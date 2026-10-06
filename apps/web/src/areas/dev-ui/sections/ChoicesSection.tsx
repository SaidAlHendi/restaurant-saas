import { Checkbox, Label, RadioGroup, RadioGroupItem, Switch } from '@app/ui';

import type { DevUiCopy } from '../dev-ui.copy.js';
import { ShowcaseRow, ShowcaseSection } from './ShowcaseSection.js';

export function ChoicesSection({ copy, idPrefix }: { copy: DevUiCopy; idPrefix: string }) {
  const c = copy.choices;
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <ShowcaseSection title={copy.sections.choices}>
      <ShowcaseRow label="Checkbox">
        <div className="flex items-center gap-2">
          <Checkbox id={id('available')} defaultChecked />
          <Label htmlFor={id('available')}>{c.available}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id={id('spicy')} />
          <Label htmlFor={id('spicy')}>{c.spicy}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id={id('all-branches')} defaultChecked="indeterminate" />
          <Label htmlFor={id('all-branches')}>{c.allBranches}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id={id('archived')} disabled defaultChecked />
          <Label htmlFor={id('archived')}>{c.archived}</Label>
        </div>
      </ShowcaseRow>
      <ShowcaseRow label="Switch">
        <div className="flex items-center gap-2">
          <Switch id={id('accept')} defaultChecked />
          <Label htmlFor={id('accept')}>{c.acceptOrders}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id={id('sound')} disabled />
          <Label htmlFor={id('sound')}>{c.soundAlerts}</Label>
        </div>
      </ShowcaseRow>
      <ShowcaseRow label={`RadioGroup — ${c.orderType}`}>
        <RadioGroup
          defaultValue="dine-in"
          className="flex flex-wrap gap-6"
          aria-label={c.orderType}
        >
          {(['dine-in', 'takeaway', 'delivery'] as const).map((value) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem
                value={value}
                id={id(`type-${value}`)}
                disabled={value === 'delivery'}
              />
              <Label htmlFor={id(`type-${value}`)}>
                {value === 'dine-in' ? c.dineIn : value === 'takeaway' ? c.takeaway : c.delivery}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </ShowcaseRow>
    </ShowcaseSection>
  );
}
