import { useCallback, useRef, useState, type DragEvent } from 'react';

export interface UseImageUploadOptions {
  accept?: string;
  disabled?: boolean;
  onFileSelect?: (file: File) => void;
}

export function useImageUpload({ accept, disabled = false, onFileSelect }: UseImageUploadOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pickFile = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) {
        return;
      }
      if (accept) {
        const accepted = accept
          .split(',')
          .map((part) => part.trim().toLowerCase())
          .filter((part) => part.length > 0);
        const name = file.name.toLowerCase();
        const type = file.type.toLowerCase();
        const ok = accepted.some((rule) => {
          if (rule.startsWith('.')) {
            return name.endsWith(rule);
          }
          if (rule.endsWith('/*')) {
            const prefix = rule.slice(0, -1);
            return type.startsWith(prefix);
          }
          return type === rule;
        });
        if (!ok) {
          return;
        }
      }
      onFileSelect?.(file);
    },
    [accept, disabled, onFileSelect],
  );

  const onInputChange = useCallback(() => {
    const file = inputRef.current?.files?.[0];
    pickFile(file);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [pickFile]);

  const openFileDialog = useCallback(() => {
    if (disabled) {
      return;
    }
    inputRef.current?.click();
  }, [disabled]);

  const onDragEnter = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled) {
        return;
      }
      setDragOver(true);
    },
    [disabled],
  );

  const onDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
  }, []);

  const onDragOver = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled) {
        return;
      }
      setDragOver(true);
    },
    [disabled],
  );

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setDragOver(false);
      if (disabled) {
        return;
      }
      const file = event.dataTransfer.files[0];
      pickFile(file);
    },
    [disabled, pickFile],
  );

  return {
    inputRef,
    dragOver,
    openFileDialog,
    onInputChange,
    dropZoneProps: {
      onDragEnter,
      onDragLeave,
      onDragOver,
      onDrop,
    },
  };
}
