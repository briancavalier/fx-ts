import { resumeLater, Resume, op, doFx } from '../../../src'
import { fail } from '../../../src/fail'
import { request as httpsRequest } from 'https'
import { IncomingMessage, request } from 'http'
import { parse as parseUrl } from 'url'

type Request = Get | Post
type Get = Req & { method: 'GET' }
type Post = Req & { method: 'POST', body: string }
type Req = { url: string, headers: { [name: string]: string } }

type Response =
  | { type: 'Response', response: IncomingMessage, body: string }
  | { type: 'ResponseFailure', response: IncomingMessage, error: Error }
  | { type: 'RequestFailure', error: Error }

export type Http = { http(r: Request): Resume<Response> }
export const http = (r: Request) => op<Http>(c => c.http(r))

export const getJson = doFx(function*<R>(url: string, headers: { [name: string]: string } = {}) {
  const result = yield* http({ method: 'GET', url, headers })
  return yield* interpretResponse<R>(url, result)
})

export const postJson = doFx(function*<A, R>(url: string, a: A, headers: { [name: string]: string } = {}) {
  const result = yield* http({ method: 'POST', url, headers, body: JSON.stringify(a) })
  return yield* interpretResponse<R>(url, result)
})

const interpretResponse = doFx(function* <R>(url: string, result: Response) {
  return result.type === 'Response' && result.response.statusCode === 200
    ? JSON.parse(result.body) as R
    : yield* fail(interpretFailure(url, result))
})

const interpretFailure = (url: string, result: Response): Error =>
  result.type === 'Response'
    ? new Error(`Request failed ${result.response.statusCode}: ${url} ${result.body}`)
    : result.error

export const httpImpl = {
  http: (r: Request): Resume<Response> =>
    resumeLater(k => {
      const options = { method: r.method, ...parseUrl(r.url), headers: r.headers }
      const req = options.protocol === 'https:' ? httpsRequest(options) : request(options)
      req.on('response', response => readResponse(response).then(
        body => k({ type: 'Response', response, body }),
        error => k({ type: 'ResponseFailure', response, error })))
      req.on('error', e => console.error('http request error', e))

      if(r.method === 'POST') req.write(r.body)

      req.end()
      return () => req.abort()
    }),
}

const readResponse = async (m: IncomingMessage): Promise<string> => {
  let data = ''
  for await (const d of m) data += d
  return data
}
