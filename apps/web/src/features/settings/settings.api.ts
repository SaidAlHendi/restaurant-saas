import {
  createPinOnlyStaffBodySchema,
  createStaffInviteBodySchema,
  createStaffInviteResponseSchema,
  orgLogoDeleteResponseSchema,
  orgLogoUploadResponseSchema,
  orgSettingsResponseSchema,
  patchOrgSettingsBodySchema,
  patchStaffMembershipBodySchema,
  putStaffPermissionOverridesBodySchema,
  putStaffPinBodySchema,
  regenerateStaffInviteResponseSchema,
  staffListResponseSchema,
  staffPermissionOverridesResponseSchema,
  type CreatePinOnlyStaffBody,
  type CreateStaffInviteBody,
  type OrgLogoDeleteResponse,
  type OrgLogoUploadResponse,
  type OrgSettingsResponse,
  type PatchOrgSettingsBody,
  type PatchStaffMembershipBody,
  type PutStaffPermissionOverridesBody,
  type PutStaffPinBody,
  type StaffListResponse,
  type StaffPermissionOverridesResponse,
} from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrgSettings: builder.query<OrgSettingsResponse, undefined>({
      query: () => '/v1/org/settings',
      transformResponse: (response: unknown) => orgSettingsResponseSchema.parse(response),
      providesTags: [{ type: 'OrgSettings', id: 'CURRENT' }],
    }),
    patchOrgSettings: builder.mutation({
      query: (body: PatchOrgSettingsBody) => ({
        url: '/v1/org/settings',
        method: 'PATCH',
        body: patchOrgSettingsBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => orgSettingsResponseSchema.parse(response),
      // The base and display currency reach branches, the POS menu, orders and reports.
      invalidatesTags: (_result, _error, body) => [
        { type: 'OrgSettings', id: 'CURRENT' },
        'Me',
        ...(body.defaultCurrency !== undefined || body.displayCurrency !== undefined
          ? (['Branch', 'PosMenu', 'Order', 'DailyReport'] as const)
          : []),
      ],
    }),
    uploadOrgLogo: builder.mutation<OrgLogoUploadResponse, File>({
      query: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: '/v1/org/logo',
          method: 'POST',
          body: formData,
        };
      },
      transformResponse: (response: unknown) => orgLogoUploadResponseSchema.parse(response),
      invalidatesTags: [{ type: 'OrgSettings', id: 'CURRENT' }, 'Me'],
    }),
    deleteOrgLogo: builder.mutation<OrgLogoDeleteResponse, undefined>({
      query: () => ({
        url: '/v1/org/logo',
        method: 'DELETE',
      }),
      transformResponse: (response: unknown) => orgLogoDeleteResponseSchema.parse(response),
      invalidatesTags: [{ type: 'OrgSettings', id: 'CURRENT' }, 'Me'],
    }),
    listStaff: builder.query<StaffListResponse, undefined>({
      query: () => '/v1/staff',
      transformResponse: (response: unknown) => staffListResponseSchema.parse(response),
      providesTags: [{ type: 'Staff', id: 'LIST' }],
    }),
    createStaffInvite: builder.mutation({
      query: (body: CreateStaffInviteBody) => ({
        url: '/v1/staff/invites',
        method: 'POST',
        body: createStaffInviteBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => createStaffInviteResponseSchema.parse(response),
      invalidatesTags: [{ type: 'Staff', id: 'LIST' }],
    }),
    createPinOnlyStaff: builder.mutation({
      query: (body: CreatePinOnlyStaffBody) => ({
        url: '/v1/staff/pin-only',
        method: 'POST',
        body: createPinOnlyStaffBodySchema.parse(body),
      }),
      invalidatesTags: [{ type: 'Staff', id: 'LIST' }],
    }),
    regenerateStaffInvite: builder.mutation({
      query: (membershipId: string) => ({
        url: `/v1/staff/${membershipId}/invite/regenerate`,
        method: 'POST',
      }),
      transformResponse: (response: unknown) => regenerateStaffInviteResponseSchema.parse(response),
      invalidatesTags: [{ type: 'Staff', id: 'LIST' }],
    }),
    revokeStaffInvite: builder.mutation({
      query: (membershipId: string) => ({
        url: `/v1/staff/${membershipId}/invite`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Staff', id: 'LIST' }],
    }),
    patchStaffMembership: builder.mutation({
      query: ({ membershipId, body }: { membershipId: string; body: PatchStaffMembershipBody }) => ({
        url: `/v1/staff/${membershipId}`,
        method: 'PATCH',
        body: patchStaffMembershipBodySchema.parse(body),
      }),
      invalidatesTags: [{ type: 'Staff', id: 'LIST' }],
    }),
    getStaffPermissions: builder.query<StaffPermissionOverridesResponse, string>({
      query: (membershipId) => `/v1/staff/${membershipId}/permissions`,
      transformResponse: (response: unknown) => staffPermissionOverridesResponseSchema.parse(response),
      providesTags: (_result, _error, membershipId) => [{ type: 'Staff', id: membershipId }],
    }),
    putStaffPermissions: builder.mutation<
      StaffPermissionOverridesResponse,
      { membershipId: string; body: PutStaffPermissionOverridesBody }
    >({
      query: ({ membershipId, body }) => ({
        url: `/v1/staff/${membershipId}/permissions`,
        method: 'PUT',
        body: putStaffPermissionOverridesBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => staffPermissionOverridesResponseSchema.parse(response),
      invalidatesTags: (_result, _error, { membershipId }) => [{ type: 'Staff', id: membershipId }],
    }),
    putStaffPin: builder.mutation({
      query: ({ membershipId, body }: { membershipId: string; body: PutStaffPinBody }) => ({
        url: `/v1/staff/${membershipId}/pin`,
        method: 'PUT',
        body: putStaffPinBodySchema.parse(body),
      }),
      invalidatesTags: [{ type: 'Staff', id: 'LIST' }],
    }),
    deleteStaffPin: builder.mutation({
      query: (membershipId: string) => ({
        url: `/v1/staff/${membershipId}/pin`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Staff', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetOrgSettingsQuery,
  usePatchOrgSettingsMutation,
  useUploadOrgLogoMutation,
  useDeleteOrgLogoMutation,
  useListStaffQuery,
  useGetStaffPermissionsQuery,
  usePutStaffPermissionsMutation,
  useCreateStaffInviteMutation,
  useCreatePinOnlyStaffMutation,
  useRegenerateStaffInviteMutation,
  useRevokeStaffInviteMutation,
  usePatchStaffMembershipMutation,
  usePutStaffPinMutation,
  useDeleteStaffPinMutation,
} = settingsApi;
