import type { LandingContent } from '../content/types.js';
import type { ContactFormViewModel } from '../hooks/use-contact-form.js';
import { ContactForm } from './ContactForm.js';
import { PhotoTile } from './PhotoTile.js';
import { Tile } from './Tile.js';

export type ContactSectionProps = {
  contact: LandingContent['contact'];
  form: LandingContent['form'];
  formState: ContactFormViewModel;
  photo: LandingContent['photos']['room'];
  email: string;
  mailto: string;
  privacyHref: string;
};

export function ContactSection({
  contact,
  form,
  formState,
  photo,
  email,
  mailto,
  privacyHref,
}: ContactSectionProps) {
  return (
    <>
      <Tile as="section" tone="paper" className="md:col-span-5 md:min-h-[420px]">
        <div>
          <h1 className="lp-display lp-stm">{contact.title}</h1>
          <p className="mt-4 max-w-[26em] text-lg text-foreground/75">{contact.lead}</p>
        </div>
        <p className="text-base">
          {contact.emailLabel}:{' '}
          <a dir="ltr" className="font-medium underline underline-offset-4" href={mailto}>
            {email}
          </a>
        </p>
      </Tile>
      <Tile as="section" tone="accent" className="justify-start md:col-span-7 md:min-h-[420px]">
        <ContactForm content={form} form={formState} privacyHref={privacyHref} />
      </Tile>
      <PhotoTile
        image="room"
        alt={photo.alt}
        sizes="100vw"
        className="md:min-h-[320px]"
        focus="center 62%"
      />
    </>
  );
}
