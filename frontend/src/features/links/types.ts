export interface CreateLinkRequest {
  long_url: string
}

export interface CreateLinkResponse {
  short_url: string
  code: string
  long_url: string
}
