import { Input, Label, Textarea } from '@app/ui';

import type { DevUiCopy } from '../dev-ui.copy.js';
import { ShowcaseSection } from './ShowcaseSection.js';

export function TextFieldsSection({ copy, idPrefix }: { copy: DevUiCopy; idPrefix: string }) {
  const f = copy.fields;
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <ShowcaseSection title={copy.sections.textFields}>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={id('name')}>{f.name}</Label>
          <Input id={id('name')} placeholder={f.namePlaceholder} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={id('price')}>{f.price}</Label>
          <Input
            id={id('price')}
            inputMode="decimal"
            defaultValue="0"
            aria-invalid
            aria-describedby={id('price-error')}
          />
          <p id={id('price-error')} className="text-sm text-destructive">
            {f.priceError}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={id('disabled')}>{f.disabled}</Label>
          <Input id={id('disabled')} disabled defaultValue={f.namePlaceholder} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={id('password')}>{f.password}</Label>
          <Input id={id('password')} type="password" defaultValue="secret123" />
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor={id('notes')}>{f.notes}</Label>
          <Textarea id={id('notes')} placeholder={f.notesPlaceholder} />
        </div>
      </div>
    </ShowcaseSection>
  );
}
