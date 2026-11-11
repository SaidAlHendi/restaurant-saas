/** What the root loader gives every page. */
export type RootLoaderData = {
  locale: string;
  dir: 'rtl' | 'ltr';
  /** Business WhatsApp number, digits with country code (a placeholder until configured). */
  whatsappNumber: string;
  /** Instagram and Facebook profile links (placeholders until configured). */
  social: { instagram: string; facebook: string };
};
