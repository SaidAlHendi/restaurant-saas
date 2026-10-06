import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

function apiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  return fromEnv && fromEnv.length > 0 ? fromEnv : 'http://localhost:3000';
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: apiBaseUrl() }),
  tagTypes: ['Health'],
  endpoints: (builder) => ({
    getHealth: builder.query<{ status: string }, undefined>({
      query: () => '/v1/health',
      providesTags: ['Health'],
    }),
  }),
});

export const { useGetHealthQuery } = baseApi;
