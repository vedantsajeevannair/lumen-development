export interface HttpClient {
  readonly baseUrl: string;
}

export function createHttpClient(baseUrl: string): HttpClient {
  return { baseUrl };
}
