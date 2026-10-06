import type { DevUiCopy } from './dev-ui.copy.js';
import type { InputsDemo, ProductFormDemo } from './product-form-demo.js';
import type { DevUiConfirmState, DevUiMenuState } from './use-dev-ui-page.js';
import { ButtonsSection } from './sections/ButtonsSection.js';
import { ChoicesSection } from './sections/ChoicesSection.js';
import { FormsSection } from './sections/FormsSection.js';
import { IconButtonsSection } from './sections/IconButtonsSection.js';
import { OverlaysSection } from './sections/OverlaysSection.js';
import { SelectsSection } from './sections/SelectsSection.js';
import { TextFieldsSection } from './sections/TextFieldsSection.js';

export interface ShowcaseProps {
  copy: DevUiCopy;
  /** Keeps input ids unique when two showcases render side by side. */
  idPrefix: string;
  themeName: string;
  menu: DevUiMenuState;
  confirm: DevUiConfirmState;
  locale: string;
  productForm: ProductFormDemo;
  inputs: InputsDemo;
}

export function Showcase({
  copy,
  idPrefix,
  themeName,
  menu,
  confirm,
  locale,
  productForm,
  inputs,
}: ShowcaseProps) {
  return (
    <div className="flex flex-col gap-10 p-6">
      <p dir="ltr" className="self-start font-mono text-xs text-muted-foreground">data-theme="{themeName}"</p>
      <ButtonsSection copy={copy} />
      <IconButtonsSection copy={copy} />
      <TextFieldsSection copy={copy} idPrefix={idPrefix} />
      <ChoicesSection copy={copy} idPrefix={idPrefix} />
      <SelectsSection copy={copy} idPrefix={idPrefix} />
      <OverlaysSection copy={copy} idPrefix={idPrefix} menu={menu} confirm={confirm} />
      <FormsSection
        copy={copy}
        idPrefix={idPrefix}
        locale={locale}
        productForm={productForm}
        inputs={inputs}
      />
    </div>
  );
}
