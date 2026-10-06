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
  iconButtons: { add: 'إضافة صنف', delete: 'حذف الصنف', settings: 'الإعدادات', next: 'الصفحة التالية' },
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
