import { IncomingMessage, request } from 'http'
import { request as httpsRequest } from 'https'
import { parse as parseUrl } from 'url'

import { Async, doFx, fail, Fail, Fx, pure, tryAsync } from '../../../../src'

// Abstract Http capability interface
export type Http<Effects, Req, Res> = { http(r: Req): Fx<Effects, Res> }

// Concrete Http implementation for Node
// Normally this would be separate from the abstract capability interface
// but for this example, we'll just put them in the same file
type Request = Get | Post
type Get = Req & { method: 'GET' }
type Post = Req & { method: 'POST', body: string }
type Req = { url: string, headers: { [name: string]: string } }

type Response = [IncomingMessage, string]

export type HttpEnv = Http<Async & Fail, Request, Response> & Async & Fail

export const getJson = <R>(url: string, headers: { [name: string]: string } = {}): Fx<HttpEnv, R> =>
  doFx(function* ({ http }: HttpEnv) {
    const result = yield* http({ method: 'GET', url, headers })
    return yield* interpretResponse<R>(url, result)
  })

export const postJson = <A, R>(url: string, a: A, headers: { [name: string]: string } = {}): Fx<HttpEnv, R> =>
  doFx(function* ({ http }: HttpEnv) {
    const result = yield* http({ method: 'POST', url, headers, body: JSON.stringify(a) })
    return yield* interpretResponse<R>(url, result)
  })

const interpretResponse = <R>(url: string, [response, body]: Response): Fx<Fail, R> =>
  response.statusCode === 200
    ? pure(JSON.parse(body) as R)
    : fail(new Error(`Request failed ${response.statusCode}: ${url} ${body}`))

export const httpEnv: Http<Async & Fail, Request, Response> = {
  http: (r: Request) => tryAsync(k => {
    const options = { method: r.method, ...parseUrl(r.url), headers: r.headers }
    const req = options.protocol === 'https:' ? httpsRequest(options) : request(options)

    req.on('response', response => readResponse(response).then(
      body => k({ ok: true, value: [response, body] }),
      error => k({ ok: false, error })))

    // Canceling a Node http request, triggers the 'error' event
    // So, we'll ignore it if we know we caused it by canceling
    req.on('error', error => {
      if (canceled) return
      k({ ok: false, error })
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
