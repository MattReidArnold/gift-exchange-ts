import type { Failure } from '#src/api/types.ts'
import { paths } from '#src/paths.ts'

export class ApiError extends Error {
  readonly status: number
  readonly failure?: Failure

  constructor(status: number, failure?: Failure) {
    super(failure?.reason ?? `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.failure = failure
  }
}

const failureFrom = (body: unknown): Failure | undefined => {
  if (typeof body !== 'object' || body === null || !('failure' in body)) {
    return undefined
  }
  const { failure } = body as { failure: Partial<Failure> }
  return typeof failure?.type === 'string' && typeof failure.reason === 'string'
    ? { type: failure.type, reason: failure.reason }
    : undefined
}

const parseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  if (!text) {
    return undefined
  }
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export const apiFetch = async <T>(
  path: string,
  { method = 'GET', body }: { method?: string; body?: unknown } = {},
): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    method,
    headers:
      body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const responseBody = await parseBody(response)
  if (!response.ok) {
    const onJoinPage = window.location.pathname.startsWith('/join/')
    if (response.status === 401 && window.location.pathname !== paths.login() && !onJoinPage) {
      window.location.assign(paths.login())
    }
    throw new ApiError(response.status, failureFrom(responseBody))
  }
  return responseBody as T
}
