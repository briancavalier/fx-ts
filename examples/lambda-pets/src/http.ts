import { resumeLater, Resume, op, doFx } from '../../../src'
import { fail } from '../../../src/fail'
import { request as httpsRequest } from 'https'
import { IncomingMessage, request } from 'http'
import { parse as parseUrl } from 'url'

type Request = Get | Post
type Get = Req & { method: 'GET' }
type Post = Req & { method: 'POST', body: string }
type Req = { url: string, headers: { [name: string]: string } }

export type Http = { http(r: Request): Resume<[IncomingMessage, string]> }
export const http = (r: Request) => op<Http>(c => c.http(r))

export const getJson = doFx(function*<R>(url: string, headers: { [name: string]: string } = {}) {
  const [response, body] = yield* http({ method: 'GET', url, headers })
  if (response.statusCode !== 200) return yield* fail(new Error(`Request failed ${response.statusCode}: ${url} ${body}`))
  return JSON.parse(body) as R
})

export const postJson = doFx(function*<A, R>(url: string, a: A, headers: { [name: string]: string } = {}) {
  const [response, body] = yield* http({ method: 'POST', url, headers, body: JSON.stringify(a) })
  if (response.statusCode !== 200) return yield* fail(new Error(`Request failed ${response.statusCode}: ${url} ${body}`))
  return JSON.parse(body) as R
})

export const httpImpl = {
  http: (r: Request): Resume<[IncomingMessage, string]> =>
    resumeLater(k => {
      const ro = { method: r.method, ...parseUrl(r.url), headers: r.headers }
      const req = ro.protocol === 'https:' ? httpsRequest(ro) : request(ro)
      req.on('response', m => readResponse(m).then(s => k([m, s]), e => k([m, String(e)])))

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
