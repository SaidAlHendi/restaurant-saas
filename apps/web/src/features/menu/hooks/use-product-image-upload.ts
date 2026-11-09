import { useCallback, useEffect, useState } from 'react';

import type { Product } from '@app/shared';

import { parseMenuApiErrorCode, type MenuApiErrorCode } from '../menu-api-errors.js';
import { isMutationError } from '../menu-mutation-result.js';
import {
  useDeleteProductImageMutation,
  useUploadProductImageMutation,
} from '../menu.api.js';
import { productImagePreviewUrl } from '../menu.utils.js';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type ProductImageUploadError =
  | 'local_unsupported_type'
  | 'local_remove'
  | MenuApiErrorCode;

export function useProductImageUpload(
  product: Product | undefined,
  options: { onCatalogChanged: () => void; onApiError: (error: unknown) => void },
) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<ProductImageUploadError | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadProductImage, uploadState] = useUploadProductImageMutation();
  const [deleteProductImage, deleteState] = useDeleteProductImageMutation();

  useEffect(() => {
    setPreviewUrl(product ? productImagePreviewUrl(product) : null);
    setLocalError(null);
    setPendingFile(null);
  }, [product]);

  // Create mode: keep the chosen file locally; it is uploaded right after the product is created.
  const uploadPending = useCallback(
    async (productId: string): Promise<boolean> => {
      if (!pendingFile) {
        return true;
      }
      const result = await uploadProductImage({ productId, file: pendingFile });
      if (isMutationError(result)) {
        options.onApiError(result.error);
        return false;
      }
      setPendingFile(null);
      return true;
    },
    [pendingFile, uploadProductImage, options],
  );

  const reset = useCallback(() => {
    setPendingFile(null);
    setPreviewUrl(null);
    setLocalError(null);
  }, []);

  const onFileSelect = (file: File) => {
    setLocalError(null);
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setLocalError('local_unsupported_type');
      return;
    }
    if (!product) {
      setPendingFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    void uploadProductImage({ productId: product.id, file }).then((result) => {
      if (isMutationError(result)) {
        URL.revokeObjectURL(objectUrl);
        setPreviewUrl(productImagePreviewUrl(product));
        const code = parseMenuApiErrorCode(result.error);
        setLocalError(code);
        options.onApiError(result.error);
        return;
      }
      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(productImagePreviewUrl(result.data));
      options.onCatalogChanged();
    });
  };

  const onRemove = () => {
    if (!product) {
      setPendingFile(null);
      setPreviewUrl(null);
      return;
    }
    setLocalError(null);
    void deleteProductImage(product.id).then((result) => {
      if (isMutationError(result)) {
        setLocalError('local_remove');
        options.onApiError(result.error);
        return;
      }
      setPreviewUrl(null);
      options.onCatalogChanged();
    });
  };

  return {
    previewUrl,
    isUploading: uploadState.isLoading,
    isRemoving: deleteState.isLoading,
    localError,
    onFileSelect,
    onRemove,
    uploadPending,
    reset,
    hasPending: pendingFile !== null,
  };
}
