import { ProductsPageView } from '../components/ProductsPageView.js';
import { useProductsScreen } from '../hooks/use-products-screen.js';

export function ProductsPage() {
  const props = useProductsScreen();
  return <ProductsPageView {...props} />;
}
