import { useEffect, useState } from 'react';

export function useImageUploadDemo() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(
    () => () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl],
  );

  const onFileSelect = (file: File) => {
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setIsUploading(true);
    setProgress(0);
    let step = 0;
    const timer = window.setInterval(() => {
      step += 20;
      setProgress(step);
      if (step >= 100) {
        window.clearInterval(timer);
        setIsUploading(false);
        setProgress(null);
      }
    }, 120);
  };

  const onRemove = () => {
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setProgress(null);
    setIsUploading(false);
  };

  return {
    previewUrl,
    progress,
    isUploading,
    onFileSelect,
    onRemove,
  };
}

export type ImageUploadDemo = ReturnType<typeof useImageUploadDemo>;
