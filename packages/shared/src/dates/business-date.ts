import { z } from 'zod';

const BUSINESS_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDateUtc(value: string): boolean {
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) {
    return false;
  }
  const d = new Date(parsed);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${String(y)}-${m}-${day}` === value;
}

export const businessDateSchema = z
  .string()
  .regex(BUSINESS_DATE_REGEX)
  .superRefine((value, ctx) => {
    if (!isValidCalendarDateUtc(value)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid calendar date',
      });
    }
  });

export type BusinessDate = z.infer<typeof businessDateSchema>;

export function inclusiveBusinessDaySpan(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  return Math.floor((end - start) / 86_400_000) + 1;
}
