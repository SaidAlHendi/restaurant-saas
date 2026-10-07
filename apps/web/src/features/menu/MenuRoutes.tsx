import { Navigate, Route, Routes } from 'react-router-dom';

import { CategoriesPage } from './pages/CategoriesPage.js';
import { ModifierGroupsPage } from './pages/ModifierGroupsPage.js';
import { ProductsPage } from './pages/ProductsPage.js';

export function MenuRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="categories" replace />} />
      <Route path="categories" element={<CategoriesPage />} />
      <Route path="products" element={<ProductsPage />} />
      <Route path="modifier-groups" element={<ModifierGroupsPage />} />
    </Routes>
  );
}
