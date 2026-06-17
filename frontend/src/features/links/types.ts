export interface CreateLinkRequest {
  long_url: string
}

export interface CreateLinkResponse {
  short_url: string
  code: string
  long_url: string
}

// A row in the owner's link list (GET /api/v1/links).
export interface LinkRow {
  short_url: string
  code: string
  long_url: string
}

// DRF PageNumberPagination envelope.
export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
