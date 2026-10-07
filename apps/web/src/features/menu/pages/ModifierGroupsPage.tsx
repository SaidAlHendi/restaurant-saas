import { ModifierFormDialogView } from '../components/ModifierFormDialogView.js';
import { ModifierGroupDetailSheetView } from '../components/ModifierGroupDetailSheetView.js';
import { ModifierGroupsPageView } from '../components/ModifierGroupsPageView.js';
import { useModifierGroupsScreen } from '../hooks/use-modifier-groups-screen.js';
import { ModifierSortableList } from '../sortable/ModifierSortableList.js';

export function ModifierGroupsPage() {
  const { pageViewProps, detailSheetProps, modifierListProps, modifierFormProps } =
    useModifierGroupsScreen();

  return (
    <>
      <ModifierGroupsPageView {...pageViewProps} />
      <ModifierGroupDetailSheetView
        {...detailSheetProps}
        modifierList={
          modifierListProps ? <ModifierSortableList {...modifierListProps} /> : undefined
        }
      />
      <ModifierFormDialogView {...modifierFormProps} />
    </>
  );
}
