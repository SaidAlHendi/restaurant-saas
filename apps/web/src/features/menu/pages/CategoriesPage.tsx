import { CategoriesPageView } from '../components/CategoriesPageView.js';
import { useCategoriesScreen } from '../hooks/use-categories-screen.js';
import { CategorySortableList } from '../sortable/CategorySortableList.js';

export function CategoriesPage() {
  const { pageViewProps, sortableListProps } = useCategoriesScreen();
  return (
    <CategoriesPageView
      {...pageViewProps}
      sortableRows={<CategorySortableList {...sortableListProps} />}
    />
  );
}
