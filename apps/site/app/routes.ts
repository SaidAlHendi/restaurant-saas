import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route(':locale/m/:orgSlug', 'routes/locale-menu.tsx'),
  route(':locale', 'routes/locale-home.tsx', { id: 'locale-home' }),
] satisfies RouteConfig;
