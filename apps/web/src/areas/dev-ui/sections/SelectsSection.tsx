import {
  Combobox,
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@app/ui';

import type { DevUiCopy } from '../dev-ui.copy.js';
import { ShowcaseSection } from './ShowcaseSection.js';

export function SelectsSection({ copy, idPrefix }: { copy: DevUiCopy; idPrefix: string }) {
  const o = copy.overlays;
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <ShowcaseSection title={copy.sections.selects}>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={id('branch')}>{o.branch}</Label>
          <Select>
            <SelectTrigger id={id('branch')}>
              <SelectValue placeholder={o.branchPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{o.branch}</SelectLabel>
                {o.branches.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectSeparator />
              <SelectItem value="disabled" disabled>
                {copy.buttons.disabled}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={id('branch-touch')}>{o.touchSelect}</Label>
          <Select key={o.branches[0]} defaultValue={o.branches[0]}>
            <SelectTrigger id={id('branch-touch')} size="touch">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {o.branches.map((branch) => (
                <SelectItem key={branch} value={branch} className="py-3 text-base">
                  {branch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={id('product')}>{o.product}</Label>
          <Combobox
            id={id('product')}
            options={o.products}
            placeholder={o.productPlaceholder}
            searchPlaceholder={o.productSearch}
            emptyText={o.productEmpty}
          />
        </div>
      </div>
    </ShowcaseSection>
  );
}
