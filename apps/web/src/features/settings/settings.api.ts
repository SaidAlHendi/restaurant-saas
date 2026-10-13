import {
  createPinOnlyStaffBodySchema,
  createStaffInviteBodySchema,
  createStaffInviteResponseSchema,
  orgLogoDeleteResponseSchema,
  orgLogoUploadResponseSchema,
  orgSettingsResponseSchema,
  patchOrgSettingsBodySchema,
  patchStaffMembershipBodySchema,
  putStaffPinBodySchema,
  regenerateStaffInviteResponseSchema,
  staffListResponseSchema,
  type CreatePinOnlyStaffBody,
  type CreateStaffInviteBody,
  type OrgLogoDeleteResponse,
  type OrgLogoUploadResponse,
  type OrgSettingsResponse,
  type PatchOrgSettingsBody,
  type PatchStaffMembershipBody,
  type PutStaffPinBody,
  type StaffListResponse,
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
      invalidatesTags: [{ type: 'OrgSettings', id: 'CURRENT' }, 'Me'],
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
  useCreateStaffInviteMutation,
  useCreatePinOnlyStaffMutation,
  useRegenerateStaffInviteMutation,
  useRevokeStaffInviteMutation,
  usePatchStaffMembershipMutation,
  usePutStaffPinMutation,
  useDeleteStaffPinMutation,
} = settingsApi;
