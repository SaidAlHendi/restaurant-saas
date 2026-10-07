// Sample text for the /dev/ui showcase (dev only, not user-facing, so not in locales/).
// Arabic samples make RTL problems visible.

export interface DevUiCopy {
  title: string;
  subtitle: string;
  toolbar: { toLight: string; toDark: string; arabic: string; sideBySide: string };
  sections: {
    buttons: string;
    iconButtons: string;
    textFields: string;
    choices: string;
    selects: string;
    overlays: string;
    forms: string;
    data: string;
    badges: string;
    layout: string;
  };
  layout: {
    sidebarLabel: string;
    close: string;
    collapse: string;
    openMenu: string;
    brand: string;
    groupMain: string;
    groupSettings: string;
    nav: {
      dashboard: string;
      orders: string;
      menu: string;
      tables: string;
      staff: string;
      settings: string;
    };
    pageTitle: string;
    pageDescription: string;
    breadcrumbs: string[];
    breadcrumbLabel: string;
    newOrder: string;
    stats: {
      sales: string;
      salesValue: string;
      salesDelta: string;
      orders: string;
      ordersValue: string;
      ordersDelta: string;
      cancelled: string;
      cancelledValue: string;
      cancelledDelta: string;
      vsYesterday: string;
    };
    tabs: {
      overview: string;
      orders: string;
      reports: string;
      overviewText: string;
      ordersText: string;
      reportsText: string;
    };
    cardTitle: string;
    cardDescription: string;
    cardBody: string;
    save: string;
    cancel: string;
    loading: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyAction: string;
    alerts: {
      info: string;
      infoText: string;
      success: string;
      successText: string;
      warning: string;
      warningText: string;
      error: string;
      errorText: string;
    };
    toasts: { show: string; success: string; error: string; info: string; warning: string };
    skeleton: string;
  };
  data: {
    search: string;
    searchPlaceholder: string;
    clear: string;
    columns: string;
    state: string;
    stateData: string;
    stateLoading: string;
    stateEmpty: string;
    stateError: string;
    order: string;
    customer: string;
    type: string;
    status: string;
    total: string;
    actions: string;
    sortBy: string;
    view: string;
    cancel: string;
    emptyTitle: string;
    errorText: string;
    retry: string;
    customers: string[];
    types: string[];
    statuses: Record<'new' | 'preparing' | 'ready' | 'completed' | 'cancelled', string>;
    pagination: string;
    previous: string;
    next: string;
    page: string;
    morePages: string;
    cursorSummary: string;
    badgeVariants: string;
  };
  forms: {
    formTitle: string;
    name: string;
    nameDescription: string;
    price: string;
    priceDescription: string;
    quantity: string;
    category: string;
    categoryPlaceholder: string;
    categories: string[];
    available: string;
    submit: string;
    reset: string;
    submitted: string;
    errors: Record<string, string>;
    moneyTitle: string;
    sar: string;
    kwd: string;
    touch: string;
    disabled: string;
    numberTitle: string;
    decrease: string;
    increase: string;
    imageUploadTitle: string;
    imageLabel: string;
    imageHint: string;
    imageChoose: string;
    imageUploading: string;
    imageRemove: string;
    imagePreviewAlt: string;
  };
  overlays: {
    branch: string;
    branchPlaceholder: string;
    branches: string[];
    touchSelect: string;
    product: string;
    productPlaceholder: string;
    productSearch: string;
    productEmpty: string;
    products: { value: string; label: string; keywords: string[] }[];
    popoverTrigger: string;
    popoverTitle: string;
    popoverBody: string;
    menuTrigger: string;
    menuLabel: string;
    menuEdit: string;
    menuDuplicate: string;
    menuShowArchived: string;
    menuSortBy: string;
    menuSortName: string;
    menuSortPrice: string;
    menuMore: string;
    menuExport: string;
    menuDelete: string;
    tooltipTrigger: string;
    tooltipText: string;
    dialogTrigger: string;
    dialogTitle: string;
    dialogDescription: string;
    save: string;
    close: string;
    confirmTrigger: string;
    confirmTitle: string;
    confirmDescription: string;
    confirmAction: string;
    confirmCancel: string;
    sheetStart: string;
    sheetEnd: string;
    sheetBottom: string;
    sheetTitle: string;
    sheetDescription: string;
  };
  buttons: {
    primary: string;
    secondary: string;
    outline: string;
    ghost: string;
    destructive: string;
    link: string;
    small: string;
    medium: string;
    large: string;
    touch: string;
    disabled: string;
    sending: string;
    next: string;
    back: string;
  };
  iconButtons: { add: string; delete: string; settings: string; next: string };
  fields: {
    name: string;
    namePlaceholder: string;
    price: string;
    priceError: string;
    disabled: string;
    notes: string;
    notesPlaceholder: string;
    password: string;
  };
  choices: {
    available: string;
    spicy: string;
    allBranches: string;
    archived: string;
    acceptOrders: string;
    soundAlerts: string;
    orderType: string;
    dineIn: string;
    takeaway: string;
    delivery: string;
  };
}

const en: DevUiCopy = {
  layout: {
    sidebarLabel: 'Main menu',
    close: 'Close menu',
    collapse: 'Collapse sidebar',
    openMenu: 'Open menu',
    brand: 'Al Bait Restaurant',
    groupMain: 'Operations',
    groupSettings: 'Admin',
    nav: {
      dashboard: 'Dashboard',
      orders: 'Orders',
      menu: 'Menu',
      tables: 'Tables',
      staff: 'Staff',
      settings: 'Settings',
    },
    pageTitle: 'Dashboard',
    pageDescription: 'Today at Riyadh – Olaya',
    breadcrumbs: ['Home', 'Riyadh – Olaya', 'Dashboard'],
    breadcrumbLabel: 'Breadcrumb',
    newOrder: 'New order',
    stats: {
      sales: "Today's sales",
      salesValue: 'SAR 12,480.00',
      salesDelta: '+12%',
      orders: 'Orders',
      ordersValue: '186',
      ordersDelta: '−4%',
      cancelled: 'Cancelled',
      cancelledValue: '3',
      cancelledDelta: '−2',
      vsYesterday: 'vs yesterday',
    },
    tabs: {
      overview: 'Overview',
      orders: 'Orders',
      reports: 'Reports',
      overviewText: 'Sales are up compared with last week.',
      ordersText: '12 orders are waiting in the kitchen.',
      reportsText: 'Reports are ready for download.',
    },
    cardTitle: 'Branch hours',
    cardDescription: 'Shown on the public menu.',
    cardBody: 'Saturday to Thursday, 12:00 to 00:00.',
    save: 'Save',
    cancel: 'Cancel',
    loading: 'Loading',
    emptyTitle: 'No orders yet',
    emptyDescription: 'New orders from the cashier and QR menu will appear here.',
    emptyAction: 'Create order',
    alerts: {
      info: 'Heads up',
      infoText: 'The menu will be published tonight.',
      success: 'Saved',
      successText: 'Your changes are live.',
      warning: 'Printer offline',
      warningText: 'Kitchen tickets are queued until it reconnects.',
      error: 'Payment failed',
      errorText: 'The card was declined. Try another method.',
    },
    toasts: {
      show: 'Show toast',
      success: 'Order #1042 saved',
      error: 'Could not reach the printer',
      info: 'New order from table 7',
      warning: 'Stock is low for Chicken shawarma',
    },
    skeleton: 'Skeleton',
  },
  title: 'UI kit',
  subtitle: 'Every @app/ui component in both themes and both directions.',
  toolbar: {
    toLight: 'Switch to cupcake (light)',
    toDark: 'Switch to forest (dark)',
    arabic: 'Arabic (RTL)',
    sideBySide: 'Both themes side by side',
  },
  sections: {
    buttons: 'Button',
    iconButtons: 'IconButton',
    textFields: 'Input, Textarea, Label',
    choices: 'Checkbox, Switch, RadioGroup',
    selects: 'Select, Combobox',
    overlays: 'Popover, DropdownMenu, Tooltip, Dialog, ConfirmDialog, Sheet',
    forms: 'Form, MoneyInput, NumberInput',
    data: 'SearchInput, DataTable, Pagination',
    badges: 'Badge',
    layout:
      'Card, Tabs, StatCard, Alert, EmptyState, Spinner, Skeleton, Toast, PageHeader, Sidebar',
  },
  data: {
    search: 'Search orders',
    searchPlaceholder: 'Search by order number or customer',
    clear: 'Clear search',
    columns: 'Columns',
    state: 'State',
    stateData: 'Data',
    stateLoading: 'Loading',
    stateEmpty: 'Empty',
    stateError: 'Error',
    order: 'Order',
    customer: 'Customer',
    type: 'Type',
    status: 'Status',
    total: 'Total',
    actions: 'Actions',
    sortBy: 'Sort by',
    view: 'View order',
    cancel: 'Cancel order',
    emptyTitle: 'No orders match your search.',
    errorText: 'Could not load orders. Check the connection and try again.',
    retry: 'Retry',
    customers: ['Ahmed', 'Sara', 'Walk-in', 'Omar', 'Lina', 'Table 4'],
    types: ['Dine-in', 'Takeaway', 'Delivery'],
    statuses: {
      new: 'New',
      preparing: 'Preparing',
      ready: 'Ready',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
    pagination: 'Pagination',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    morePages: 'More pages',
    cursorSummary: 'Cursor pagination (no total count)',
    badgeVariants: 'Badge variants',
  },
  forms: {
    formTitle: 'Product form (react-hook-form + zod)',
    name: 'Product name',
    nameDescription: 'Shown on the public menu.',
    price: 'Price',
    priceDescription: 'Stored as minor units (halalas).',
    quantity: 'Default quantity',
    category: 'Category',
    categoryPlaceholder: 'Choose a category',
    categories: ['Sandwiches', 'Salads', 'Drinks'],
    available: 'Available today',
    submit: 'Save product',
    reset: 'Reset',
    submitted: 'Submitted values',
    errors: {
      'errors.nameTooShort': 'Name must be at least 2 characters.',
      'errors.priceRequired': 'Enter a price.',
      'errors.pricePositive': 'Price must be greater than zero.',
      'errors.categoryRequired': 'Choose a category.',
    },
    moneyTitle: 'MoneyInput',
    sar: 'SAR (2 decimals)',
    kwd: 'KWD (3 decimals)',
    touch: 'Touch size',
    disabled: 'Disabled',
    numberTitle: 'NumberInput',
    decrease: 'Decrease',
    increase: 'Increase',
    imageUploadTitle: 'ImageUpload',
    imageLabel: 'Drop an image here',
    imageHint: 'JPEG, PNG or WebP',
    imageChoose: 'Choose file',
    imageUploading: 'Uploading',
    imageRemove: 'Remove',
    imagePreviewAlt: 'Preview',
  },
  overlays: {
    branch: 'Branch',
    branchPlaceholder: 'Choose a branch',
    branches: ['Riyadh – Olaya', 'Riyadh – Malqa', 'Jeddah – Tahlia'],
    touchSelect: 'Touch size (POS)',
    product: 'Product (searchable)',
    productPlaceholder: 'Choose a product',
    productSearch: 'Search products…',
    productEmpty: 'No product found.',
    products: [
      { value: 'shawarma', label: 'Chicken shawarma', keywords: ['شاورما دجاج'] },
      { value: 'falafel', label: 'Falafel wrap', keywords: ['فلافل'] },
      { value: 'hummus', label: 'Hummus plate', keywords: ['حمص'] },
      { value: 'mutabbal', label: 'Mutabbal', keywords: ['متبل'] },
      { value: 'lemonade', label: 'Mint lemonade', keywords: ['ليمون بالنعناع'] },
    ],
    popoverTrigger: 'Opening hours',
    popoverTitle: 'Today',
    popoverBody: '9:00 AM – 11:30 PM. Kitchen closes 30 minutes earlier.',
    menuTrigger: 'Actions',
    menuLabel: 'Product',
    menuEdit: 'Edit',
    menuDuplicate: 'Duplicate',
    menuShowArchived: 'Show archived',
    menuSortBy: 'Sort by',
    menuSortName: 'Name',
    menuSortPrice: 'Price',
    menuMore: 'More',
    menuExport: 'Export CSV',
    menuDelete: 'Delete',
    tooltipTrigger: 'Hover or focus me',
    tooltipText: 'Prices include VAT',
    dialogTrigger: 'Edit product',
    dialogTitle: 'Edit product',
    dialogDescription: 'Change the name and kitchen notes, then save.',
    save: 'Save',
    close: 'Close',
    confirmTrigger: 'Cancel order #42',
    confirmTitle: 'Cancel order #42?',
    confirmDescription: 'The kitchen will be told to stop preparing it. This cannot be undone.',
    confirmAction: 'Cancel order',
    confirmCancel: 'Keep order',
    sheetStart: 'Sheet: start',
    sheetEnd: 'Sheet: end',
    sheetBottom: 'Sheet: bottom',
    sheetTitle: 'Order #42',
    sheetDescription: '2 × Chicken shawarma, 1 × Mint lemonade',
  },
  buttons: {
    primary: 'Save',
    secondary: 'Secondary',
    outline: 'Outline',
    ghost: 'Ghost',
    destructive: 'Cancel order',
    link: 'View details',
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    touch: 'Touch 48px',
    disabled: 'Disabled',
    sending: 'Sending…',
    next: 'Next',
    back: 'Back',
  },
  iconButtons: { add: 'Add item', delete: 'Delete item', settings: 'Settings', next: 'Next page' },
  fields: {
    name: 'Product name',
    namePlaceholder: 'Chicken shawarma',
    price: 'Price',
    priceError: 'Price must be greater than zero.',
    disabled: 'Disabled field',
    notes: 'Kitchen notes',
    notesPlaceholder: 'No onions, extra garlic sauce',
    password: 'Password',
  },
  choices: {
    available: 'Available today',
    spicy: 'Spicy',
    allBranches: 'All branches',
    archived: 'Archived (disabled)',
    acceptOrders: 'Accept online orders',
    soundAlerts: 'Sound alerts (disabled)',
    orderType: 'Order type',
    dineIn: 'Dine-in',
    takeaway: 'Takeaway',
    delivery: 'Delivery',
  },
};

const ar: DevUiCopy = {
  layout: {
    sidebarLabel: 'القائمة الرئيسية',
    close: 'إغلاق القائمة',
    collapse: 'طي الشريط الجانبي',
    openMenu: 'فتح القائمة',
    brand: 'مطعم البيت',
    groupMain: 'التشغيل',
    groupSettings: 'الإدارة',
    nav: {
      dashboard: 'لوحة التحكم',
      orders: 'الطلبات',
      menu: 'المنيو',
      tables: 'الطاولات',
      staff: 'الموظفون',
      settings: 'الإعدادات',
    },
    pageTitle: 'لوحة التحكم',
    pageDescription: 'اليوم في فرع الرياض – العليا',
    breadcrumbs: ['الرئيسية', 'الرياض – العليا', 'لوحة التحكم'],
    breadcrumbLabel: 'مسار التنقل',
    newOrder: 'طلب جديد',
    stats: {
      sales: 'مبيعات اليوم',
      salesValue: '١٢٬٤٨٠٫٠٠ ر.س',
      salesDelta: '+١٢٪',
      orders: 'الطلبات',
      ordersValue: '١٨٦',
      ordersDelta: '−٤٪',
      cancelled: 'الملغاة',
      cancelledValue: '٣',
      cancelledDelta: '−٢',
      vsYesterday: 'مقارنة بالأمس',
    },
    tabs: {
      overview: 'نظرة عامة',
      orders: 'الطلبات',
      reports: 'التقارير',
      overviewText: 'المبيعات أعلى من الأسبوع الماضي.',
      ordersText: '١٢ طلبًا بانتظار المطبخ.',
      reportsText: 'التقارير جاهزة للتنزيل.',
    },
    cardTitle: 'ساعات عمل الفرع',
    cardDescription: 'تظهر في المنيو العام.',
    cardBody: 'من السبت إلى الخميس، من ١٢:٠٠ ظهرًا حتى ١٢:٠٠ منتصف الليل.',
    save: 'حفظ',
    cancel: 'إلغاء',
    loading: 'جارٍ التحميل',
    emptyTitle: 'لا توجد طلبات بعد',
    emptyDescription: 'ستظهر هنا الطلبات الجديدة من الكاشير ومنيو QR.',
    emptyAction: 'إنشاء طلب',
    alerts: {
      info: 'تنبيه',
      infoText: 'سيُنشر المنيو الليلة.',
      success: 'تم الحفظ',
      successText: 'تغييراتك أصبحت فعّالة.',
      warning: 'الطابعة غير متصلة',
      warningText: 'تذاكر المطبخ في الانتظار حتى تعود الطابعة.',
      error: 'فشل الدفع',
      errorText: 'رُفضت البطاقة. جرّب طريقة أخرى.',
    },
    toasts: {
      show: 'إظهار إشعار',
      success: 'تم حفظ الطلب #1042',
      error: 'تعذّر الوصول إلى الطابعة',
      info: 'طلب جديد من الطاولة 7',
      warning: 'المخزون منخفض لشاورما الدجاج',
    },
    skeleton: 'هيكل التحميل',
  },
  title: 'مكتبة الواجهة',
  subtitle: 'كل مكونات ‎@app/ui‎ بالثيمين وبالاتجاهين.',
  toolbar: {
    toLight: 'التبديل إلى cupcake (فاتح)',
    toDark: 'التبديل إلى forest (داكن)',
    arabic: 'العربية (RTL)',
    sideBySide: 'الثيمان جنباً إلى جنب',
  },
  sections: {
    buttons: 'الأزرار',
    iconButtons: 'أزرار الأيقونات',
    textFields: 'حقول النص والعناوين',
    choices: 'مربعات الاختيار والمفاتيح وأزرار الراديو',
    selects: 'القوائم المنسدلة والبحث',
    overlays: 'النوافذ المنبثقة والقوائم والتلميحات والحوارات واللوحات',
    forms: 'النماذج وحقول المبالغ والأرقام',
    data: 'البحث والجداول والتنقل بين الصفحات',
    badges: 'الشارات',
    layout: 'البطاقات والتبويبات والتنبيهات والإشعارات والشريط الجانبي',
  },
  data: {
    search: 'بحث في الطلبات',
    searchPlaceholder: 'ابحث برقم الطلب أو اسم العميل',
    clear: 'مسح البحث',
    columns: 'الأعمدة',
    state: 'الحالة',
    stateData: 'بيانات',
    stateLoading: 'تحميل',
    stateEmpty: 'فارغ',
    stateError: 'خطأ',
    order: 'الطلب',
    customer: 'العميل',
    type: 'النوع',
    status: 'الحالة',
    total: 'الإجمالي',
    actions: 'إجراءات',
    sortBy: 'ترتيب حسب',
    view: 'عرض الطلب',
    cancel: 'إلغاء الطلب',
    emptyTitle: 'لا توجد طلبات تطابق البحث.',
    errorText: 'تعذّر تحميل الطلبات. تحقق من الاتصال وحاول مرة أخرى.',
    retry: 'إعادة المحاولة',
    customers: ['أحمد', 'سارة', 'زبون مباشر', 'عمر', 'لينا', 'طاولة ٤'],
    types: ['محلي', 'سفري', 'توصيل'],
    statuses: {
      new: 'جديد',
      preparing: 'قيد التحضير',
      ready: 'جاهز',
      completed: 'مكتمل',
      cancelled: 'ملغي',
    },
    pagination: 'التنقل بين الصفحات',
    previous: 'السابق',
    next: 'التالي',
    page: 'صفحة',
    morePages: 'صفحات أخرى',
    cursorSummary: 'تنقل بالمؤشر (بدون عدد إجمالي)',
    badgeVariants: 'أنواع الشارات',
  },
  forms: {
    formTitle: 'نموذج منتج (react-hook-form + zod)',
    name: 'اسم المنتج',
    nameDescription: 'يظهر في المنيو العام.',
    price: 'السعر',
    priceDescription: 'يُحفظ بالوحدة الصغرى (هللة).',
    quantity: 'الكمية الافتراضية',
    category: 'التصنيف',
    categoryPlaceholder: 'اختر تصنيفاً',
    categories: ['سندويشات', 'سلطات', 'مشروبات'],
    available: 'متوفر اليوم',
    submit: 'حفظ المنتج',
    reset: 'إعادة تعيين',
    submitted: 'القيم المرسلة',
    errors: {
      'errors.nameTooShort': 'يجب أن يكون الاسم حرفين على الأقل.',
      'errors.priceRequired': 'أدخل السعر.',
      'errors.pricePositive': 'يجب أن يكون السعر أكبر من صفر.',
      'errors.categoryRequired': 'اختر تصنيفاً.',
    },
    moneyTitle: 'حقل المبلغ',
    sar: 'ريال (منزلتان)',
    kwd: 'دينار كويتي (٣ منازل)',
    touch: 'حجم اللمس',
    disabled: 'معطّل',
    numberTitle: 'حقل الرقم',
    decrease: 'إنقاص',
    increase: 'زيادة',
    imageUploadTitle: 'ImageUpload',
    imageLabel: 'أسقط صورة هنا',
    imageHint: 'JPEG أو PNG أو WebP',
    imageChoose: 'اختر ملفاً',
    imageUploading: 'جاري الرفع',
    imageRemove: 'إزالة',
    imagePreviewAlt: 'معاينة',
  },
  overlays: {
    branch: 'الفرع',
    branchPlaceholder: 'اختر فرعاً',
    branches: ['الرياض – العليا', 'الرياض – الملقا', 'جدة – التحلية'],
    touchSelect: 'حجم اللمس (الكاشير)',
    product: 'المنتج (مع بحث)',
    productPlaceholder: 'اختر منتجاً',
    productSearch: 'ابحث عن منتج…',
    productEmpty: 'لا يوجد منتج.',
    products: [
      { value: 'shawarma', label: 'شاورما دجاج', keywords: ['Chicken shawarma'] },
      { value: 'falafel', label: 'لفافة فلافل', keywords: ['Falafel'] },
      { value: 'hummus', label: 'صحن حمص', keywords: ['Hummus'] },
      { value: 'mutabbal', label: 'متبل', keywords: ['Mutabbal'] },
      { value: 'lemonade', label: 'ليمون بالنعناع', keywords: ['Lemonade'] },
    ],
    popoverTrigger: 'ساعات العمل',
    popoverTitle: 'اليوم',
    popoverBody: '٩:٠٠ ص – ١١:٣٠ م. يغلق المطبخ قبل ٣٠ دقيقة.',
    menuTrigger: 'إجراءات',
    menuLabel: 'المنتج',
    menuEdit: 'تعديل',
    menuDuplicate: 'نسخ',
    menuShowArchived: 'إظهار المؤرشف',
    menuSortBy: 'ترتيب حسب',
    menuSortName: 'الاسم',
    menuSortPrice: 'السعر',
    menuMore: 'المزيد',
    menuExport: 'تصدير CSV',
    menuDelete: 'حذف',
    tooltipTrigger: 'مرّر أو ركّز هنا',
    tooltipText: 'الأسعار شاملة الضريبة',
    dialogTrigger: 'تعديل المنتج',
    dialogTitle: 'تعديل المنتج',
    dialogDescription: 'غيّر الاسم وملاحظات المطبخ ثم احفظ.',
    save: 'حفظ',
    close: 'إغلاق',
    confirmTrigger: 'إلغاء الطلب #٤٢',
    confirmTitle: 'إلغاء الطلب #٤٢؟',
    confirmDescription: 'سيتم إبلاغ المطبخ بإيقاف التحضير. لا يمكن التراجع.',
    confirmAction: 'إلغاء الطلب',
    confirmCancel: 'إبقاء الطلب',
    sheetStart: 'لوحة: البداية',
    sheetEnd: 'لوحة: النهاية',
    sheetBottom: 'لوحة: الأسفل',
    sheetTitle: 'الطلب #٤٢',
    sheetDescription: '٢ × شاورما دجاج، ١ × ليمون بالنعناع',
  },
  buttons: {
    primary: 'حفظ',
    secondary: 'ثانوي',
    outline: 'بإطار',
    ghost: 'شفاف',
    destructive: 'إلغاء الطلب',
    link: 'عرض التفاصيل',
    small: 'صغير',
    medium: 'متوسط',
    large: 'كبير',
    touch: 'لمس ٤٨px',
    disabled: 'معطّل',
    sending: 'جارٍ الإرسال…',
    next: 'التالي',
    back: 'السابق',
  },
  iconButtons: {
    add: 'إضافة صنف',
    delete: 'حذف الصنف',
    settings: 'الإعدادات',
    next: 'الصفحة التالية',
  },
  fields: {
    name: 'اسم المنتج',
    namePlaceholder: 'شاورما دجاج',
    price: 'السعر',
    priceError: 'يجب أن يكون السعر أكبر من صفر.',
    disabled: 'حقل معطّل',
    notes: 'ملاحظات للمطبخ',
    notesPlaceholder: 'بدون بصل، صوص ثوم إضافي',
    password: 'كلمة المرور',
  },
  choices: {
    available: 'متوفر اليوم',
    spicy: 'حار',
    allBranches: 'كل الفروع',
    archived: 'مؤرشف (معطّل)',
    acceptOrders: 'استقبال الطلبات أونلاين',
    soundAlerts: 'تنبيهات صوتية (معطّل)',
    orderType: 'نوع الطلب',
    dineIn: 'محلي',
    takeaway: 'سفري',
    delivery: 'توصيل',
  },
};

export const devUiCopy = { en, ar } as const;
