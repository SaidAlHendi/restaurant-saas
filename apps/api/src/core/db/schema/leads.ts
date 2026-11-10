import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Marketing leads from the public contact form. Platform-level data: no `org_id`, no RLS. The API
 * role may only INSERT (see migration); reading them is for platform staff, not for request handlers.
 */
export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'won', 'lost']);

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    status: leadStatusEnum('status').notNull().default('new'),
    name: text('name').notNull(),
    restaurantName: text('restaurant_name').notNull(),
    phone: text('phone').notNull(),
    email: text('email').notNull(),
    /** ISO 3166-1 alpha-2; `ZZ` means another country. */
    country: text('country').notNull(),
    branches: integer('branches').notNull(),
    /** Language of the page the visitor used: `ar` or `en`. */
    locale: text('locale').notNull(),
    message: text('message'),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    utmTerm: text('utm_term'),
    utmContent: text('utm_content'),
    gclid: text('gclid'),
    fbclid: text('fbclid'),
    referrer: text('referrer'),
    landingPath: text('landing_path'),
  },
  (t) => [index('leads_created_at_idx').on(t.createdAt), index('leads_email_idx').on(t.email)],
);
