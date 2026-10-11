import { QrCard } from '@app/ui';

import type { QrCodesCardViewModel } from './QrCodesPageView.js';

export type QrPrintLayoutViewProps = {
  heading: string;
  branchLine?: string;
  cards: QrCodesCardViewModel[];
  qrLoading: boolean;
  loadingQrLabel: string;
  onBackLabel: string;
  onBack: () => void;
  printLabel: string;
  onPrint: () => void;
};

export function QrPrintLayoutView({
  heading,
  branchLine,
  cards,
  qrLoading,
  loadingQrLabel,
  onBackLabel,
  onBack,
  printLabel,
  onPrint,
}: QrPrintLayoutViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">{heading}</h1>
          {branchLine ? <p className="text-sm text-muted-foreground">{branchLine}</p> : null}
        </div>
        <div className="flex gap-2">
          <button type="button" className="text-sm underline" onClick={onBack}>
            {onBackLabel}
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm font-medium"
            onClick={onPrint}
          >
            {printLabel}
          </button>
        </div>
      </div>
      <div className="hidden print:block">
        <h1 className="text-center text-xl font-semibold">{heading}</h1>
        {branchLine ? <p className="text-center text-sm">{branchLine}</p> : null}
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
        {cards.map((card) => (
          <QrCard
            key={card.id}
            title={card.title}
            subtitle={card.subtitle}
            qrDataUrl={card.qrDataUrl}
            loading={qrLoading && card.qrDataUrl === null}
            loadingLabel={loadingQrLabel}
          />
        ))}
      </div>
    </div>
  );
}
