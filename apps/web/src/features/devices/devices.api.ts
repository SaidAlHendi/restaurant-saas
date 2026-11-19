import {
  createPosDeviceBodySchema,
  createPosDeviceResponseSchema,
  posDeviceListResponseSchema,
  type CreatePosDeviceBody,
  type PosDeviceListResponse,
} from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export const devicesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listDevices: builder.query<PosDeviceListResponse, undefined>({
      query: () => '/v1/devices',
      transformResponse: (response: unknown) => posDeviceListResponseSchema.parse(response),
      providesTags: [{ type: 'PosDevice', id: 'LIST' }],
    }),
    createDevice: builder.mutation({
      query: (body: CreatePosDeviceBody) => ({
        url: '/v1/devices',
        method: 'POST',
        body: createPosDeviceBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => createPosDeviceResponseSchema.parse(response),
      invalidatesTags: [{ type: 'PosDevice', id: 'LIST' }],
    }),
    revokeDevice: builder.mutation<undefined, string>({
      query: (deviceId) => ({ url: `/v1/devices/${deviceId}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'PosDevice', id: 'LIST' }],
    }),
  }),
});

export const { useListDevicesQuery, useCreateDeviceMutation, useRevokeDeviceMutation } = devicesApi;
