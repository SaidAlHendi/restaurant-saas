import type { LandingContent } from './types.js';

export const landingEn: LandingContent = {
  lang: 'en',
  meta: {
    title: 'Sahtain — POS and kitchen display for restaurants',
    description:
      'A point of sale, kitchen display and owner dashboard in one system built for Arabic first. Start with a free digital menu and add the till later.',
  },
  skipLink: 'Skip to content',
  nav: {
    brand: 'Sahtain',
    brandLabel: 'Sahtain, home',
    ariaLabel: 'Main navigation',
    links: [
      { id: 'flow', label: 'How it works' },
      { id: 'kitchen', label: 'Kitchen' },
      { id: 'plans', label: 'Plans' },
      { id: 'faq', label: 'FAQ' },
    ],
    cta: 'Start your free trial',
    menuLabel: 'Menu',
    switchLabel: 'AR',
    switchName: 'العربية',
  },
  hero: {
    wordmark: 'Sahtain',
    h1: 'The restaurant system that speaks Arabic.',
    statement: 'Write the order once. It reaches the kitchen instantly.',
    body: 'A till, a kitchen display and an owner dashboard. Designed right to left first.',
    cta: 'Start your free trial',
    tabletTitle: 'From the till to the kitchen, without shouting.',
    tabletBody:
      'A point of sale, a kitchen display and an owner dashboard in one system, designed for Arabic first.',
  },
  photos: {
    tablet: {
      alt: 'A hand holding a tablet that shows the cashier screen in a restaurant',
      caption: 'Cashier',
    },
    room: { alt: 'A warm dining room in evening light with a plate on the table', caption: 'Dining room' },
    pasta: { alt: 'A plate of spaghetti with tomato sauce and basil on a wooden table', caption: 'The plate' },
    pass: {
      alt: 'A chef’s hands presenting a fish dish at the pass next to an order ticket',
      caption: 'Kitchen',
    },
    tiramisu: { alt: 'A slice of tiramisu with a cup of coffee on a marble table', caption: 'Dessert and coffee' },
  },
  flow: {
    tag: 'One day in your restaurant',
    title: 'From the menu to the invoice, on one screen.',
    lead: 'From setting up the menu before opening, to the first order, to the end-of-month bill.',
    stops: [
      {
        tag: 'Before opening',
        title: 'Set up your menu yourself',
        body: 'Items, prices and photos in Arabic and English. One edit shows up at the till and in your QR menu.',
        media: { kind: 'image', image: 'screen-products', alt: 'The products screen in the Sahtain dashboard' },
      },
      {
        tag: 'Before opening',
        title: 'Modifiers the way guests order',
        body: 'Size, milk type, sugar level. Make a choice required or optional, and set the price difference.',
        media: { kind: 'image', image: 'screen-modifiers', alt: 'The modifier groups screen' },
      },
      {
        tag: 'During service',
        title: 'The cashier adds the order',
        body: 'Tap an item, then “Send to kitchen”. A real recording from the app.',
        media: {
          kind: 'video',
          video: 'pos',
          poster: 'poster-pos',
          label: 'A real recording of the cashier screen: three items are added and the order is sent to the kitchen',
        },
      },
      {
        tag: 'During service',
        title: 'The ticket reaches the kitchen at once',
        body: 'New, then preparing, then ready. The cashier sees the status from the counter.',
        media: {
          kind: 'video',
          video: 'kds',
          poster: 'poster-kds',
          label: 'A real recording of the kitchen screen: the ticket arrives, the cook starts it, and it becomes ready',
        },
      },
      {
        tag: 'After service',
        title: 'All your branches in one dashboard',
        body: 'Branches, staff and devices, from anywhere, at any time.',
        media: { kind: 'image', image: 'screen-branches', alt: 'The branches screen' },
      },
      {
        tag: 'End of month',
        title: 'A clear invoice and a plan that grows with you',
        body: 'See what you pay and why. Change plan when your restaurant changes.',
        media: { kind: 'image', image: 'screen-billing', alt: 'The billing screen' },
      },
    ],
  },
  kitchen: {
    title: 'Kitchen display: every ticket in its place.',
    tickets: [
      {
        meta: 'Table 4 · 12:40',
        number: '#23',
        status: 'New',
        tone: 'new',
        items: [
          { qty: '2×', name: 'Latte' },
          { qty: '1×', name: 'Za’atar croissant' },
        ],
      },
      {
        meta: 'Takeaway · 12:34',
        number: '#22',
        status: 'Preparing',
        tone: 'cooking',
        items: [
          { qty: '1×', name: 'Double espresso' },
          { qty: '1×', name: 'Carrot cake' },
          { qty: '1×', name: 'Karak tea' },
        ],
      },
      {
        meta: 'Table 2 · 12:30',
        number: '#21',
        status: 'Ready',
        tone: 'ready',
        items: [{ qty: '3×', name: 'Cappuccino' }],
      },
    ],
  },
  plans: {
    title: 'Four plans. Clear prices.',
    items: [
      {
        key: 'free',
        name: 'Free',
        priceMinor: 0,
        currency: 'USD',
        unit: '',
        highlight: false,
        features: ['Up to 40 products', 'One staff member per branch'],
      },
      {
        key: 'menu',
        name: 'Menu',
        priceMinor: 1200,
        currency: 'USD',
        unit: '/ month',
        highlight: false,
        features: ['Arabic and English', 'Your logo, no “Powered by”', 'QR code for every table', 'Unlimited products'],
      },
      {
        key: 'restaurant',
        name: 'Restaurant',
        priceMinor: 3900,
        currency: 'USD',
        unit: '/ branch / month',
        highlight: true,
        features: ['Cashier and kitchen display', 'Daily reports', '10 staff per branch'],
      },
      {
        key: 'business',
        name: 'Business',
        priceMinor: 7900,
        currency: 'USD',
        unit: '/ branch / month',
        highlight: false,
        features: ['Multiple branches', 'Advanced reports and export', 'Custom roles and API'],
      },
    ],
  },
  faq: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'What is Sahtain?',
        a: 'A restaurant system with a till, a kitchen display, a digital menu and an owner dashboard.',
      },
      {
        q: 'Do I need special hardware?',
        a: 'No. Sahtain runs in the browser on any tablet, computer or phone, and you do not need a dedicated till. You can start with a device you already own.',
      },
      { q: 'Do you support more than one branch?', a: 'Yes, on the Business plan.' },
      { q: 'How do I start?', a: 'Request a free trial and we will open your account.' },
    ],
  },
  closing: {
    title: 'Ready for your first order?',
    body: 'Request your free trial and we will open your account.',
    cta: 'Start your free trial',
    ctaSubject: 'Free trial request',
  },
  footer: {
    rights: '© Sahtain · getsahtain.com',
    privacy: 'Privacy',
    terms: 'Terms',
    contact: 'Contact us',
  },
};
