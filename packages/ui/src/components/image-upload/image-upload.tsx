import type { ReactNode } from 'react';
import { ImageIcon, UploadIcon, XIcon } from 'lucide-react';

import { useImageUpload, type UseImageUploadOptions } from '../../hooks/use-image-upload.js';
import { cn } from '../../lib/cn.js';
import { Button } from '../button/button.js';
import { Spinner } from '../spinner/spinner.js';

export interface ImageUploadProps extends UseImageUploadOptions {
  /** Current preview URL (remote or object URL from the feature hook). */
  previewUrl?: string | null;
  /** Drop zone title (translated). */
  label: string;
  /** Hint under the title, e.g. max size (translated). */
  hint?: string;
  /** Shown when upload failed (translated). */
  error?: string | null;
  /** 0–100 while uploading; omit when idle. */
  progress?: number | null;
  isUploading?: boolean;
  disabled?: boolean;
  /** Replace / choose file (translated). */
  chooseLabel: string;
  /** Shown with the spinner while uploading (translated). */
  uploadingLabel: string;
  /** Remove image (translated). */
  removeLabel: string;
  /** Alt text for preview image (translated). */
  previewAlt: string;
  name?: string;
  id?: string;
  className?: string;
  /** Optional slot below the drop zone (errors from the form, etc.). */
  footer?: ReactNode;
  onRemove?: () => void;
}

export function ImageUpload({
  previewUrl,
  label,
  hint,
  error,
  progress,
  isUploading = false,
  disabled = false,
  chooseLabel,
  uploadingLabel,
  removeLabel,
  previewAlt,
  accept = 'image/jpeg,image/png,image/webp',
  onFileSelect,
  onRemove,
  name,
  id,
  className,
  footer,
}: ImageUploadProps) {
  const { inputRef, dragOver, openFileDialog, onInputChange, dropZoneProps } = useImageUpload({
    accept,
    disabled: disabled || isUploading,
    onFileSelect,
  });

  const busy = disabled || isUploading;
  const progressPercent =
    typeof progress === 'number' ? Math.min(100, Math.max(0, progress)) : null;

  return (
    <div data-slot="image-upload" className={cn('flex flex-col gap-2', className)}>
      <input
        ref={inputRef}
        type="file"
        name={name}
        id={id}
        accept={accept}
        className="sr-only"
        disabled={busy}
        onChange={onInputChange}
      />
      <div
        {...dropZoneProps}
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-disabled={busy}
        aria-label={label}
        onKeyDown={(event) => {
          if (busy) {
            return;
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openFileDialog();
          }
        }}
        onClick={() => {
          if (!previewUrl) {
            openFileDialog();
          }
        }}
        className={cn(
          'relative flex min-h-40 flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-dashed bg-muted/30 p-4 text-center transition-colors',
          dragOver && !busy && 'border-primary bg-primary/5',
          error && 'border-destructive',
          !busy && 'cursor-pointer hover:bg-muted/50',
          busy && 'opacity-70',
        )}
      >
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt={previewAlt}
              className="max-h-48 w-full object-contain"
            />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={(event) => {
                  event.stopPropagation();
                  openFileDialog();
                }}
              >
                <UploadIcon className="size-4" aria-hidden />
                {chooseLabel}
              </Button>
              {onRemove ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove();
                  }}
                >
                  <XIcon className="size-4" aria-hidden />
                  {removeLabel}
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <ImageIcon className="size-10 text-muted-foreground" aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{label}</p>
              {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={(event) => {
                event.stopPropagation();
                openFileDialog();
              }}
            >
              <UploadIcon className="size-4" aria-hidden />
              {chooseLabel}
            </Button>
          </>
        )}
        {isUploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80">
            <Spinner label={uploadingLabel} />
            {progressPercent !== null ? (
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent}
                className="h-1.5 w-48 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full bg-primary transition-[width]"
                  style={{ width: `${String(progressPercent)}%` }}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {footer}
    </div>
  );
}
