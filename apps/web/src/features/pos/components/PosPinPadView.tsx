import { Button } from '@app/ui';

export type PosPinPadViewProps = {
  digits: string;
  pinDigitsLabel: string;
  canSubmit: boolean;
  submitting: boolean;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  labels: {
    backspace: string;
    submit: string;
  };
};

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'back'],
] as const;

export function PosPinPadView(props: PosPinPadViewProps) {
  const { digits, pinDigitsLabel, canSubmit, submitting, onDigit, onBackspace, onSubmit, labels } =
    props;
  const masked = '•'.repeat(digits.length);
  return (
    <div className="mx-auto w-full max-w-xs space-y-4">
      <p
        className="text-center font-mono text-2xl tracking-widest"
        aria-live="polite"
        aria-label={pinDigitsLabel}
      >
        {masked.length > 0 ? masked : '—'}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {DIGIT_ROWS.flatMap((row) =>
          row.map((cell) => {
            if (cell === '') {
              return <span key="spacer" />;
            }
            if (cell === 'back') {
              return (
                <Button
                  key="back"
                  type="button"
                  size="touch"
                  variant="outline"
                  onClick={() => {
                    onBackspace();
                  }}
                >
                  {labels.backspace}
                </Button>
              );
            }
            return (
              <Button
                key={cell}
                type="button"
                size="touch"
                variant="secondary"
                onClick={() => {
                  onDigit(cell);
                }}
              >
                {cell}
              </Button>
            );
          }),
        )}
      </div>
      <Button
        type="button"
        size="touch"
        className="w-full"
        disabled={!canSubmit}
        isLoading={submitting}
        onClick={() => {
          onSubmit();
        }}
      >
        {labels.submit}
      </Button>
    </div>
  );
}
