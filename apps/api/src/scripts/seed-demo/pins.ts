export const DEMO_STAFF_PINS = {
  owner: '1111',
  manager: '2222',
  cashier1: '3333',
  cashier2: '4444',
  kitchen1: '5555',
  pinOnlyCashier: '6666',
} as const;

export function printDemoPinLegend(orgSlugs: string[]): void {
  const slugList = orgSlugs.join(', ');
  process.stdout.write(`
Demo staff PINs (each org: ${slugList}):
  owner (owner1):            ${DEMO_STAFF_PINS.owner}
  manager (manager1):        ${DEMO_STAFF_PINS.manager}
  cashier1:                  ${DEMO_STAFF_PINS.cashier1}
  cashier2:                  ${DEMO_STAFF_PINS.cashier2}
  kitchen (kitchen1):        ${DEMO_STAFF_PINS.kitchen1}
  PIN-only cashier:            ${DEMO_STAFF_PINS.pinOnlyCashier}
`);
}
