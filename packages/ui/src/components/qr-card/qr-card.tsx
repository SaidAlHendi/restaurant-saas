import type * as React from 'react';

import { cn } from '../../lib/cn.js';
import { Button } from '../button/index.js';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../card/index.js';
import { Spinner } from '../spinner/index.js';

export type QrCardProps = {
  title: string;
  subtitle?: string;
  caption?: string;
  qrDataUrl: string | null;
  loading?: boolean;
  loadingLabel?: string;
  href?: string;
  downloadLabel?: string;
  onDownload?: () => void;
  className?: string;
};

export function QrCard({
  title,
  subtitle,
  caption,
  qrDataUrl,
  loading = false,
  loadingLabel = 'Loading',
  href,
  downloadLabel,
  onDownload,
  className,
}: QrCardProps) {
  const showDownload = downloadLabel !== undefined && onDownload !== undefined;

  return (
    <Card
      className={cn('qr-print-card break-inside-avoid print:border print:shadow-none', className)}
      data-slot="qr-card"
    >
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-base">{title}</CardTitle>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 pt-0">
        <div className="flex size-48 items-center justify-center rounded-md border bg-background p-2">
          {loading ? (
            <Spinner label={loadingLabel} />
          ) : qrDataUrl ? (
            <img src={qrDataUrl} alt="" className="size-full object-contain" width={256} height={256} />
          ) : (
            <span className="text-sm text-muted-foreground">{loadingLabel}</span>
          )}
        </div>
        {caption ? <p className="text-center text-xs text-muted-foreground">{caption}</p> : null}
        {href ? (
          <a href={href} className="max-w-full truncate text-xs text-primary underline" target="_blank" rel="noreferrer">
            {href}
          </a>
        ) : null}
      </CardContent>
      {showDownload ? (
        <CardFooter className="justify-center print:hidden">
          <Button type="button" variant="outline" size="sm" onClick={onDownload}>
            {downloadLabel}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
