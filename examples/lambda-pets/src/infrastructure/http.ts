import { IncomingMessage, request } from 'http'
import { request as httpsRequest } from 'https'
import { parse as parseUrl } from 'url'

import { Async, async, doFx, fail, Fail, Fx, get } from '../../../../src'

type Request = Get | Post
type Get = Req & { method: 'GET' }
type Post = Req & { method: 'POST', body: string }
type Req = { url: string, headers: { [name: string]: string } }

type Response =
  | { type: 'Response', response: IncomingMessage, body: string }
  | { type: 'ResponseFailure', response: IncomingMessage, error: Error }
  | { type: 'RequestFailure', error: Error }

export type Http = { http(r: Request): Fx<Async, Response> }

export type HttpEnv = Http & Async & Fail

export const getJson = <R>(url: string, headers: { [name: string]: string } = {}): Fx<HttpEnv, R> => doFx(function* () {
  const { http } = yield* get<Http>()
  const result = yield* http({ method: 'GET', url, headers })
  return yield* interpretResponse<R>(url, result)
})

export const postJson = <A, R>(url: string, a: A, headers: { [name: string]: string } = {}): Fx<HttpEnv, R> => doFx(function* () {
  const { http } = yield* get<Http>()
  const result = yield* http({ method: 'POST', url, headers, body: JSON.stringify(a) })
  return yield* interpretResponse<R>(url, result)
})

const interpretResponse = <R>(url: string, result: Response): Fx<Fail, R> => doFx(function* () {
  return result.type === 'Response' && result.response.statusCode === 200
    ? JSON.parse(result.body) as R
    : yield* fail(interpretFailure(url, result))
})

const interpretFailure = (url: string, result: Response): Error =>
  result.type === 'Response'
    ? new Error(`Request failed ${result.response.statusCode}: ${url} ${result.body}`)
    : result.error

export const httpImpl = {
  http: (r: Request): Fx<Async, Response> =>
    async(k => {
      const options = { method: r.method, ...parseUrl(r.url), headers: r.headers }
      const req = options.protocol === 'https:' ? httpsRequest(options) : request(options)

      req.on('response', response => readResponse(response).then(
        body => k({ type: 'Response', response, body }),
        error => k({ type: 'ResponseFailure', response, error })))

      req.on('error', error => {
        if (canceled) return
        k({ type: 'RequestFailure', error })
      })

      if (r.method === 'POST') req.write(r.body)

      req.end()

      let canceled = false
      return () => {
        canceled = true
        req.abort()
      }
    }),
}

const readResponse = async (m: IncomingMessage): Promise<string> => {
  let data = ''
  for await (const d of m) data += d
  return data
}
