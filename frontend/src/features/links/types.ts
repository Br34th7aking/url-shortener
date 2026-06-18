export interface CreateLinkRequest {
  long_url: string
  // Optional custom alias; omit for a random server-generated code.
  code?: string
  // Optional ISO-8601 expiry; omit for a never-expiring link.
  expires_at?: string
}

export interface CreateLinkResponse {
  short_url: string
  code: string
  long_url: string
  expires_at: string | null
}

// A row in the owner's link list (GET /api/v1/links).
export interface LinkRow {
  short_url: string
  code: string
  long_url: string
  expires_at: string | null
}

// DRF PageNumberPagination envelope.
export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
