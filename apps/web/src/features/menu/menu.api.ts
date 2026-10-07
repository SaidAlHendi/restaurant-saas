import { z } from 'zod';

import {
  categoryListResponseSchema,
  categorySchema,
  createCategoryBodySchema,
  createModifierBodySchema,
  createModifierGroupBodySchema,
  createProductBodySchema,
  modifierGroupDetailSchema,
  modifierGroupListResponseSchema,
  modifierGroupSchema,
  modifierSchema,
  patchCategoryBodySchema,
  patchModifierBodySchema,
  patchModifierGroupBodySchema,
  patchProductBodySchema,
  productDetailSchema,
  productListResponseSchema,
  productSchema,
  reorderBodySchema,
  reorderModifiersBodySchema,
  reorderProductsBodySchema,
  setProductModifierGroupsBodySchema,
  type CreateCategoryBody,
  type CreateModifierBody,
  type CreateModifierGroupBody,
  type CreateProductBody,
  type PatchCategoryBody,
  type PatchModifierBody,
  type PatchModifierGroupBody,
  type PatchProductBody,
  type ProductListQuery,
  type ReorderBody,
  type ReorderModifiersBody,
  type ReorderProductsBody,
  type SetProductModifierGroupsBody,
} from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

type CategoryListResponse = z.infer<typeof categoryListResponseSchema>;
type ModifierGroupListResponse = z.infer<typeof modifierGroupListResponseSchema>;
type ProductListResponse = z.infer<typeof productListResponseSchema>;

export const menuApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listCategories: builder.query<CategoryListResponse, undefined>({
      query: () => '/v1/categories',
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((item) => ({ type: 'Category' as const, id: item.id })),
              { type: 'Category', id: 'LIST' },
            ]
          : [{ type: 'Category', id: 'LIST' }],
      transformResponse: (response: unknown) => categoryListResponseSchema.parse(response),
    }),
    createCategory: builder.mutation({
      query: (body: CreateCategoryBody) => ({
        url: '/v1/categories',
        method: 'POST',
        body: createCategoryBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => categorySchema.parse(response),
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),
    patchCategory: builder.mutation({
      query: ({ categoryId, body }: { categoryId: string; body: PatchCategoryBody }) => ({
        url: `/v1/categories/${categoryId}`,
        method: 'PATCH',
        body: patchCategoryBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => categorySchema.parse(response),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Category', id: arg.categoryId },
        { type: 'Category', id: 'LIST' },
      ],
    }),
    deleteCategory: builder.mutation({
      query: (categoryId: string) => ({
        url: `/v1/categories/${categoryId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),
    reorderCategories: builder.mutation({
      query: (body: ReorderBody) => ({
        url: '/v1/categories/reorder',
        method: 'PUT',
        body: reorderBodySchema.parse(body),
      }),
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),

    listProducts: builder.query<ProductListResponse, ProductListQuery>({
      query: (params) => ({
        url: '/v1/products',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((item) => ({ type: 'Product' as const, id: item.id })),
              { type: 'Product', id: 'LIST' },
            ]
          : [{ type: 'Product', id: 'LIST' }],
      transformResponse: (response: unknown) => productListResponseSchema.parse(response),
    }),
    getProduct: builder.query({
      query: (productId: string) => `/v1/products/${productId}`,
      providesTags: (_result, _error, productId) => [{ type: 'Product', id: productId }],
      transformResponse: (response: unknown) => productDetailSchema.parse(response),
    }),
    createProduct: builder.mutation({
      query: (body: CreateProductBody) => ({
        url: '/v1/products',
        method: 'POST',
        body: createProductBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => productSchema.parse(response),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }],
    }),
    patchProduct: builder.mutation({
      query: ({ productId, body }: { productId: string; body: PatchProductBody }) => ({
        url: `/v1/products/${productId}`,
        method: 'PATCH',
        body: patchProductBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => productSchema.parse(response),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Product', id: arg.productId },
        { type: 'Product', id: 'LIST' },
      ],
    }),
    deleteProduct: builder.mutation({
      query: (productId: string) => ({
        url: `/v1/products/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }],
    }),
    reorderProducts: builder.mutation({
      query: (body: ReorderProductsBody) => ({
        url: '/v1/products/reorder',
        method: 'PUT',
        body: reorderProductsBodySchema.parse(body),
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }],
    }),
    setProductModifierGroups: builder.mutation({
      query: ({
        productId,
        body,
      }: {
        productId: string;
        body: SetProductModifierGroupsBody;
      }) => ({
        url: `/v1/products/${productId}/modifier-groups`,
        method: 'PUT',
        body: setProductModifierGroupsBodySchema.parse(body),
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Product', id: arg.productId }],
    }),
    uploadProductImage: builder.mutation({
      query: ({ productId, file }: { productId: string; file: File }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/v1/products/${productId}/image`,
          method: 'POST',
          body: formData,
        };
      },
      transformResponse: (response: unknown) => productSchema.parse(response),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Product', id: arg.productId },
        { type: 'Product', id: 'LIST' },
      ],
    }),
    deleteProductImage: builder.mutation({
      query: (productId: string) => ({
        url: `/v1/products/${productId}/image`,
        method: 'DELETE',
      }),
      transformResponse: (response: unknown) => productSchema.parse(response),
      invalidatesTags: (_result, _error, productId) => [
        { type: 'Product', id: productId },
        { type: 'Product', id: 'LIST' },
      ],
    }),

    listModifierGroups: builder.query<ModifierGroupListResponse, undefined>({
      query: () => '/v1/modifier-groups',
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((item) => ({ type: 'ModifierGroup' as const, id: item.id })),
              { type: 'ModifierGroup', id: 'LIST' },
            ]
          : [{ type: 'ModifierGroup', id: 'LIST' }],
      transformResponse: (response: unknown) => modifierGroupListResponseSchema.parse(response),
    }),
    getModifierGroup: builder.query({
      query: (groupId: string) => `/v1/modifier-groups/${groupId}`,
      providesTags: (_result, _error, groupId) => [{ type: 'ModifierGroup', id: groupId }],
      transformResponse: (response: unknown) => modifierGroupDetailSchema.parse(response),
    }),
    createModifierGroup: builder.mutation({
      query: (body: CreateModifierGroupBody) => ({
        url: '/v1/modifier-groups',
        method: 'POST',
        body: createModifierGroupBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => modifierGroupSchema.parse(response),
      invalidatesTags: [{ type: 'ModifierGroup', id: 'LIST' }],
    }),
    patchModifierGroup: builder.mutation({
      query: ({ groupId, body }: { groupId: string; body: PatchModifierGroupBody }) => ({
        url: `/v1/modifier-groups/${groupId}`,
        method: 'PATCH',
        body: patchModifierGroupBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => modifierGroupSchema.parse(response),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'ModifierGroup', id: arg.groupId },
        { type: 'ModifierGroup', id: 'LIST' },
      ],
    }),
    deleteModifierGroup: builder.mutation({
      query: (groupId: string) => ({
        url: `/v1/modifier-groups/${groupId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'ModifierGroup', id: 'LIST' }],
    }),
    createModifier: builder.mutation({
      query: ({ groupId, body }: { groupId: string; body: CreateModifierBody }) => ({
        url: `/v1/modifier-groups/${groupId}/modifiers`,
        method: 'POST',
        body: createModifierBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => modifierSchema.parse(response),
      invalidatesTags: (_result, _error, arg) => [{ type: 'ModifierGroup', id: arg.groupId }],
    }),
    patchModifier: builder.mutation({
      query: ({
        groupId,
        modifierId,
        body,
      }: {
        groupId: string;
        modifierId: string;
        body: PatchModifierBody;
      }) => ({
        url: `/v1/modifier-groups/${groupId}/modifiers/${modifierId}`,
        method: 'PATCH',
        body: patchModifierBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => modifierSchema.parse(response),
      invalidatesTags: (_result, _error, arg) => [{ type: 'ModifierGroup', id: arg.groupId }],
    }),
    deleteModifier: builder.mutation({
      query: ({ groupId, modifierId }: { groupId: string; modifierId: string }) => ({
        url: `/v1/modifier-groups/${groupId}/modifiers/${modifierId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'ModifierGroup', id: arg.groupId }],
    }),
    reorderModifiers: builder.mutation({
      query: ({ groupId, body }: { groupId: string; body: ReorderModifiersBody }) => ({
        url: `/v1/modifier-groups/${groupId}/modifiers/reorder`,
        method: 'PUT',
        body: reorderModifiersBodySchema.parse(body),
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'ModifierGroup', id: arg.groupId }],
    }),
  }),
});

export const {
  useListCategoriesQuery,
  useCreateCategoryMutation,
  usePatchCategoryMutation,
  useDeleteCategoryMutation,
  useReorderCategoriesMutation,
  useListProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  usePatchProductMutation,
  useDeleteProductMutation,
  useReorderProductsMutation,
  useSetProductModifierGroupsMutation,
  useUploadProductImageMutation,
  useDeleteProductImageMutation,
  useListModifierGroupsQuery,
  useGetModifierGroupQuery,
  useCreateModifierGroupMutation,
  usePatchModifierGroupMutation,
  useDeleteModifierGroupMutation,
  useCreateModifierMutation,
  usePatchModifierMutation,
  useDeleteModifierMutation,
  useReorderModifiersMutation,
} = menuApi;
