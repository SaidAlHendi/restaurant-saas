export type ImagesMode = 'on' | 'off';

export type DemoSeedCliOptions = {
  reset: boolean;
  images: ImagesMode;
  days: number;
  orgSlug: string | undefined;
  anchor: Date;
};

function parseImages(value: string | undefined): ImagesMode {
  if (value === undefined || value === 'off') {
    return 'off';
  }
  if (value === 'on') {
    return 'on';
  }
  throw new Error(`Invalid --images value "${value}" (use on or off)`);
}

function parseAnchor(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid --anchor "${value}" (use YYYY-MM-DD)`);
  }
  // 19:30 UTC = 22:30 in Asia/Riyadh: the anchor day has a full service day of history.
  const parsed = new Date(`${value}T19:30:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid --anchor "${value}"`);
  }
  return parsed;
}

export function parseDemoSeedArgv(argv: string[]): DemoSeedCliOptions {
  let reset = false;
  let images: ImagesMode = 'off';
  let days = 30;
  let orgSlug: string | undefined;
  let anchor: Date = new Date();

  for (const arg of argv) {
    if (arg === '--reset') {
      reset = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      throw new Error('HELP');
    }
    if (arg.startsWith('--images=')) {
      images = parseImages(arg.slice('--images='.length));
      continue;
    }
    if (arg.startsWith('--days=')) {
      const n = Number.parseInt(arg.slice('--days='.length), 10);
      if (Number.isNaN(n) || n < 1) {
        throw new Error(`Invalid --days value in "${arg}"`);
      }
      days = n;
      continue;
    }
    if (arg.startsWith('--org=')) {
      const slug = arg.slice('--org='.length).trim();
      if (slug.length === 0) {
        throw new Error('Invalid --org (empty slug)');
      }
      orgSlug = slug;
      continue;
    }
    if (arg.startsWith('--anchor=')) {
      anchor = parseAnchor(arg.slice('--anchor='.length));
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { reset, images, days, orgSlug, anchor };
}

export function printDemoSeedHelp(): void {
  process.stdout.write(
    [
      'Usage: pnpm db:seed:demo [--reset] [--images=on|off] [--days=N] [--org=slug] [--anchor=YYYY-MM-DD]',
      '',
      '  --reset          Remove seed-* orgs (app_owner) and their storage prefix, then re-seed',
      '  --images=on|off  Upload product images from Unsplash cache (default off)',
      '  --days=N         Order history days (default 30)',
      '  --org=slug       Limit to one seed org slug',
      '  --anchor=DATE    Fixed anchor (DATE 19:30 UTC) for deterministic data (default: now)',
      '',
    ].join('\n'),
  );
}
