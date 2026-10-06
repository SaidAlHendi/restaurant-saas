// Sample text for the /dev/ui showcase (dev only, not user-facing, so not in locales/).
// Arabic samples make RTL problems visible.

export interface DevUiCopy {
  title: string;
  subtitle: string;
  toolbar: { toLight: string; toDark: string; arabic: string; sideBySide: string };
  sections: { buttons: string; iconButtons: string; textFields: string; choices: string };
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
