import { CheckIcon, CopyIcon, DownloadIcon, PrinterIcon } from 'lucide-react';

import { Alert, AlertDescription, Button, EmptyState, PageHeader, Spinner, cn } from '@app/ui';

export type QrCodesCardViewModel = {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  qrDataUrl: string | null;
  downloadFileName: string;
};

export type QrCodesPageViewProps = {
  title: string;
  subtitle: string;
  branchMissing: boolean;
  branchMissingTitle: string;
  branchMissingDescription: string;
  isLoading: boolean;
  qrLoading: boolean;
  cards: QrCodesCardViewModel[];
  tableQrAvailable: boolean;
  tableQrUpsell: string;
  emptyTitle: string;
  emptyDescription: string;
  showTableQrHint: boolean;
  printLabel: string;
  downloadLabel: string;
  loadingQrLabel: string;
  copyLabel: string;
  copiedLabel: string;
  copiedUrl: string | null;
  onCopy: (url: string) => void;
  onPrint: () => void;
  onDownload: (url: string, fileName: string) => void;
};

export function QrCodesPageView({
  title,
  subtitle,
  branchMissing,
  branchMissingTitle,
  branchMissingDescription,
  isLoading,
  qrLoading,
  cards,
  showTableQrHint,
  tableQrUpsell,
  emptyTitle,
  emptyDescription,
  printLabel,
  downloadLabel,
  loadingQrLabel,
  copyLabel,
  copiedLabel,
  copiedUrl,
  onCopy,
  onPrint,
  onDownload,
}: QrCodesPageViewProps) {
  if (branchMissing) {
    return <EmptyState title={branchMissingTitle} description={branchMissingDescription} />;
  }

  const menuCard = cards.find((card) => card.id === 'menu');
  const tableCardsList = cards.filter((card) => card.id !== 'menu');
  const actions = { downloadLabel, copyLabel, copiedLabel, onDownload, onCopy, copiedUrl };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={subtitle}
        actions={
          cards.length > 0 ? (
            <Button type="button" variant="outline" onClick={onPrint}>
              <PrinterIcon aria-hidden className="size-4" />
              {printLabel}
            </Button>
          ) : null
        }
      />
      {showTableQrHint ? (
        <Alert role="status" variant="info">
          <AlertDescription className="text-foreground">{tableQrUpsell}</AlertDescription>
        </Alert>
      ) : null}
      {isLoading ? (
        <Spinner label={title} />
      ) : cards.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="flex flex-col gap-8">
          {menuCard ? (
            <section className="bg-primary text-primary-foreground grid items-center gap-8 rounded-3xl p-6 sm:p-10 md:grid-cols-[1fr_auto]">
              <div className="flex flex-col items-start gap-5">
                <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                  {menuCard.title}
                </h2>
                {menuCard.subtitle ? (
                  <p className="text-primary-foreground/85 max-w-prose text-base">
                    {menuCard.subtitle}
                  </p>
                ) : null}
                <p
                  className="bg-primary-foreground/15 max-w-full truncate rounded-full px-4 py-2 text-sm"
                  dir="ltr"
                >
                  {menuCard.url}
                </p>
                <QrActions card={menuCard} {...actions} variant="inverse" />
              </div>
              <QrTile card={menuCard} size="lg" loading={qrLoading} loadingLabel={loadingQrLabel} />
            </section>
          ) : null}
          {tableCardsList.length > 0 ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tableCardsList.map((card) => (
                <li
                  key={card.id}
                  className="bg-card flex flex-col items-center gap-5 rounded-2xl p-5 pt-6 shadow-sm"
                >
                  <span className="bg-primary text-primary-foreground rounded-full px-5 py-1.5 text-xl font-semibold">
                    {card.title}
                  </span>
                  <QrTile card={card} size="md" loading={qrLoading} loadingLabel={loadingQrLabel} />
                  <QrActions card={card} {...actions} variant="default" />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}

function QrTile({
  card,
  size,
  loading,
  loadingLabel,
}: {
  card: QrCodesCardViewModel;
  size: 'md' | 'lg';
  loading: boolean;
  loadingLabel: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-2xl bg-white p-3 shadow-sm',
        size === 'lg' ? 'size-56 sm:size-64' : 'size-44',
      )}
    >
      {card.qrDataUrl ? (
        <img src={card.qrDataUrl} alt="" className="size-full object-contain" />
      ) : loading ? (
        <Spinner label={loadingLabel} />
      ) : null}
    </div>
  );
}

function QrActions({
  card,
  downloadLabel,
  copyLabel,
  copiedLabel,
  onDownload,
  onCopy,
  copiedUrl,
  variant,
}: {
  card: QrCodesCardViewModel;
  downloadLabel: string;
  copyLabel: string;
  copiedLabel: string;
  onDownload: (url: string, fileName: string) => void;
  onCopy: (url: string) => void;
  copiedUrl: string | null;
  variant: 'default' | 'inverse';
}) {
  const inverse = variant === 'inverse';
  const copied = copiedUrl === card.url;
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button
        type="button"
        size="sm"
        variant={inverse ? 'secondary' : 'default'}
        disabled={card.qrDataUrl === null}
        onClick={() => {
          onDownload(card.url, card.downloadFileName);
        }}
      >
        <DownloadIcon aria-hidden className="size-4" />
        {downloadLabel}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={inverse ? 'ghost' : 'outline'}
        className={
          inverse
            ? 'text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground'
            : undefined
        }
        onClick={() => {
          onCopy(card.url);
        }}
      >
        {copied ? (
          <CheckIcon aria-hidden className="size-4" />
        ) : (
          <CopyIcon aria-hidden className="size-4" />
        )}
        {copied ? copiedLabel : copyLabel}
      </Button>
    </div>
  );
}
