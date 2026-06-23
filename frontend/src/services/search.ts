import client from '../api/client';
import type { SearchRequest, SearchResponse } from '../types';

export async function search(params: SearchRequest): Promise<SearchResponse> {
  const response = await client.post<SearchResponse>('/search', params);
  return response.data;
}
