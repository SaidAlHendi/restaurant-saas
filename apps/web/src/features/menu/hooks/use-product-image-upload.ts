import { useEffect, useState } from 'react';

import type { Product } from '@app/shared';

import {
  useDeleteProductImageMutation,
  useUploadProductImageMutation,
} from '../menu.api.js';
import { productImagePreviewUrl } from '../menu.utils.js';

export function useProductImageUpload(product: Product | undefined) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [uploadProductImage, uploadState] = useUploadProductImageMutation();
  const [deleteProductImage, deleteState] = useDeleteProductImageMutation();

  useEffect(() => {
    setPreviewUrl(product ? productImagePreviewUrl(product) : null);
    setLocalError(null);
  }, [product]);

  const onFileSelect = (file: File) => {
    if (!product) {
      return;
    }
    setLocalError(null);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    void uploadProductImage({ productId: product.id, file })
      .unwrap()
      .then((updated) => {
        URL.revokeObjectURL(objectUrl);
        setPreviewUrl(productImagePreviewUrl(updated));
      })
      .catch(() => {
        URL.revokeObjectURL(objectUrl);
        setPreviewUrl(productImagePreviewUrl(product));
        setLocalError('upload');
      });
  };

  const onRemove = () => {
    if (!product) {
      return;
    }
    setLocalError(null);
    void deleteProductImage(product.id)
      .unwrap()
      .then(() => {
        setPreviewUrl(null);
      })
      .catch(() => {
        setLocalError('remove');
      });
  };

  return {
    previewUrl,
    isUploading: uploadState.isLoading,
    isRemoving: deleteState.isLoading,
    localError,
    onFileSelect,
    onRemove,
  };
}
