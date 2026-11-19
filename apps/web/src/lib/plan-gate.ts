/**
 * The plan / trial gate (trial-ended banner, locked cashier, kitchen and reports) only applies in
 * staging and production builds. In development, test and any other mode it never blocks access.
 */
export function isPlanGateEnabled(mode: string = import.meta.env.MODE): boolean {
  return mode === 'staging' || mode === 'production';
}
