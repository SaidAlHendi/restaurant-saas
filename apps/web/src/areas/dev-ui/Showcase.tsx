import type { DevUiCopy } from './dev-ui.copy.js';
import { ButtonsSection } from './sections/ButtonsSection.js';
import { ChoicesSection } from './sections/ChoicesSection.js';
import { IconButtonsSection } from './sections/IconButtonsSection.js';
import { TextFieldsSection } from './sections/TextFieldsSection.js';

export interface ShowcaseProps {
  copy: DevUiCopy;
  /** Keeps input ids unique when two showcases render side by side. */
  idPrefix: string;
  themeName: string;
}

export function Showcase({ copy, idPrefix, themeName }: ShowcaseProps) {
  return (
    <div className="flex flex-col gap-10 p-6">
      <p dir="ltr" className="self-start font-mono text-xs text-muted-foreground">data-theme="{themeName}"</p>
      <ButtonsSection copy={copy} />
      <IconButtonsSection copy={copy} />
      <TextFieldsSection copy={copy} idPrefix={idPrefix} />
      <ChoicesSection copy={copy} idPrefix={idPrefix} />
    </div>
  );
}
