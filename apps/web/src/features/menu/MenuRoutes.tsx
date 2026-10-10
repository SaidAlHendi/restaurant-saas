import { Navigate, Route, Routes } from 'react-router-dom';

import { QrCodesPage } from '../tables/pages/QrCodesPage.js';
import { QrPrintPage } from '../tables/pages/QrPrintPage.js';
import { TablesPage } from '../tables/pages/TablesPage.js';

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
      <Route path="tables" element={<TablesPage />} />
      <Route path="qr-codes" element={<QrCodesPage />} />
      <Route path="qr-codes/print" element={<QrPrintPage />} />
    </Routes>
  );
}
