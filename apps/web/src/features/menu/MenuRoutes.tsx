import { Navigate, Route, Routes } from 'react-router-dom';

import { CategoriesScreen } from './screens/categories-screen.js';
import { ModifierGroupsScreen } from './screens/modifier-groups-screen.js';
import { ProductsScreen } from './screens/products-screen.js';

export function MenuRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="categories" replace />} />
      <Route path="categories" element={<CategoriesScreen />} />
      <Route path="products" element={<ProductsScreen />} />
      <Route path="modifier-groups" element={<ModifierGroupsScreen />} />
    </Routes>
  );
}
