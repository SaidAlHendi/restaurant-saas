import { useState } from 'react';

import { toast, useDisclosure } from '@app/ui';

import type { DevUiCopy } from './dev-ui.copy.js';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

/** State for the layout section: sidebar, nav selection and toast buttons. */
export function useLayoutDemo(copy: DevUiCopy) {
  const collapse = useDisclosure();
  const mobile = useDisclosure();
  const [activeItem, setActiveItem] = useState('dashboard');

  const onToast = (kind: ToastKind) => {
    const t = copy.layout.toasts;
    if (kind === 'success') toast.success(t.success);
    else if (kind === 'error') toast.error(t.error);
    else if (kind === 'warning') toast.warning(t.warning);
    else toast.info(t.info);
  };

  return {
    collapsed: collapse.open,
    onToggleCollapsed: collapse.toggle,
    mobileOpen: mobile.open,
    onMobileOpenChange: mobile.setOpen,
    onOpenMobile: mobile.onOpen,
    activeItem,
    onActiveItemChange: setActiveItem,
    onToast,
  };
}

export type LayoutDemo = ReturnType<typeof useLayoutDemo>;
