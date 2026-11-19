import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('robots.txt', 'routes/robots[.]txt.tsx'),
  route('sitemap.xml', 'routes/sitemap[.]xml.tsx'),
  route('t/:token', 'routes/table-redirect.tsx'),
  route(':locale/m/:orgSlug/:branchSlug', 'routes/locale-menu-branch.tsx'),
  route(':locale/m/:orgSlug', 'routes/locale-menu.tsx'),
  route(':locale/plans', 'routes/locale-plans.tsx'),
  route(':locale/faq', 'routes/locale-faq.tsx'),
  route(':locale/contact', 'routes/locale-contact.tsx'),
  route(':locale/privacy', 'routes/locale-privacy.tsx'),
  route(':locale/terms', 'routes/locale-terms.tsx'),
  route(':locale/thanks', 'routes/locale-thanks.tsx'),
  route(':locale', 'routes/locale-home.tsx', { id: 'locale-home' }),
] satisfies RouteConfig;
