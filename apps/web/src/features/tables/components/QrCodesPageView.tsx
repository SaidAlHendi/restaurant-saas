import { PrinterIcon } from 'lucide-react';

import { Alert, Button, EmptyState, PageHeader, QrCard, Spinner } from '@app/ui';

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
  showTableQrHint: boolean;
  printLabel: string;
  downloadLabel: string;
  loadingQrLabel: string;
  onPrint: () => void;
  onDownload: (dataUrl: string, fileName: string) => void;
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
  printLabel,
  downloadLabel,
  loadingQrLabel,
  onPrint,
  onDownload,
}: QrCodesPageViewProps) {
  if (branchMissing) {
    return <EmptyState title={branchMissingTitle} description={branchMissingDescription} />;
  }

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
      {showTableQrHint ? <Alert>{tableQrUpsell}</Alert> : null}
      {isLoading ? (
        <Spinner label={title} />
      ) : cards.length === 0 ? (
        <EmptyState title={title} description={subtitle} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <QrCard
              key={card.id}
              title={card.title}
              subtitle={card.subtitle}
              caption={card.url}
              href={card.url}
              qrDataUrl={card.qrDataUrl}
              loading={qrLoading && card.qrDataUrl === null}
              loadingLabel={loadingQrLabel}
              downloadLabel={downloadLabel}
              onDownload={
                card.qrDataUrl
                  ? () => {
                      onDownload(card.qrDataUrl ?? '', card.downloadFileName);
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
