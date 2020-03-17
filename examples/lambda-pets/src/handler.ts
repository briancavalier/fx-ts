import { APIGatewayProxyHandler, APIGatewayProxyResult, APIGatewayProxyEvent } from 'aws-lambda'
import 'source-map-support/register'

import { co, Resume, op, unsafeRun, resumeNow, use, resumeLater, get } from '../../../src'
import { timeout } from '../../../src/timer'
import { request as httpsRequest } from 'https'
import { IncomingMessage, RequestOptions, request } from 'http'
import { parse as parseUrl } from 'url'
import { Location, GeoLocation, Pets } from './domain'
import { getIpLocation } from './location'
import { authPets, getPets } from './pets'
import { renderPets, renderError } from './render'

type Log = { log(s: string): Resume<void> }
const log = (s: string) => op<Log>(c => c.log(s))

const fetchPets = co(function*<Token>(l: GeoLocation, radiusMiles: number) {
  const token = yield* authPets<Token>()
  if(token instanceof Error) return token

  return yield* getPets<Token>(token, l, radiusMiles)
})

type PetsToken = {
  access_token: string
}

const getJson = <A>(url: string, headers: { [name: string]: string } = {}): Resume<A | Error> =>
  resumeLater(k => {
    const r = {
      method: 'GET',
      ...parseUrl(url),
      headers
    }
    const req = r.protocol === 'https:' ? httpsRequest(r) : request(r)
    req.on('response', m => readResponse<A>(r, m).then(k, k))
    req.on('error', k)
    req.end()
    return () => req.abort()
  })

const postJson = <A, R>(url: string, a: A, headers: { [name: string]: string } = {}): Resume<R | Error> =>
  resumeLater(k => {
    const r: RequestOptions = {
      method: 'POST',
      ...parseUrl(url),
      headers
    }
    const req = r.protocol === 'https:' ? httpsRequest(r) : request(r)
    req.on('response', m => readResponse<R>(r, m).then(k, k))
    req.on('error', k)
    req.write(JSON.stringify(a))
    req.end()
    return () => req.abort()
  })

const readResponse = async <A>(r: RequestOptions, m: IncomingMessage): Promise<A> => {
  let data = ''
  for await (const d of m) data += d
  if (m.statusCode !== 200) throw new Error(`Request failed ${m.statusCode}: ${data} ${JSON.stringify(r)}`)
  return JSON.parse(data)
}

const capabilities = {
  radiusMiles: Number(process.env.DEFAULT_RADIUS_MILES) || 10,

  locationTimeout: Number(process.env.LOCATION_TIMEOUT) || 500,

  petsTimeout: Number(process.env.PETS_TIMEOUT) || 500,

  log: (s: string) => resumeNow(console.log(s)),

  getIpLocation: (hostOrIp: string): Resume<Partial<Location> | Error> =>
    getJson(`http://api.ipstack.com/${hostOrIp}?hostname=1&access_key=${process.env.IPSTACK_KEY}`),

  authPets: (): Resume<PetsToken | Error> =>
    postJson('https://api.petfinder.com/v2/oauth2/token', {
      grant_type: 'client_credentials',
      client_id: process.env.PETFINDER_ID,
      client_secret: process.env.PETFINDER_SECRET
    }),

  getPets: (t: PetsToken, l: GeoLocation, radiusMiles: number): Resume<Pets | Error> =>
    getJson(`https://api.petfinder.com/v2/animals?location=${l.latitude},${l.longitude}&distance=${Math.ceil(radiusMiles)}`, {
      Authorization: `Bearer ${t.access_token}`
    }),

  delay: (ms: number): Resume<void> => resumeLater(k => {
    const t = setTimeout(k, ms)
    return () => clearTimeout(t)
  })
}

export const getAdoptablePetsNearby: APIGatewayProxyHandler = event =>
  new Promise<APIGatewayProxyResult>(resolve =>
    unsafeRun(use(main(event), capabilities), resolve))

const getLocation = co(function*(host: string) {
  const location = yield* getIpLocation(host)
  if(location instanceof Error) return location
  if(typeof location.latitude === 'number' && typeof location.longitude === 'number') return location as Location
  return new Error(`Could not get location for ${host}`)
})

type Config = {
  radiusMiles: number,
  locationTimeout: number,
  petsTimeout: number,
}

const main = co(function* (event: APIGatewayProxyEvent) {
  const { radiusMiles, locationTimeout, petsTimeout } = yield* get<Config>()
  const host = getHost(event)

  const location = (yield* timeout(locationTimeout, getLocation(host))) || new Error(`Timeout trying to get location for ${host}`)

  if (location instanceof Error) return { statusCode: 500, body: renderError(location) }
  
  yield* log(`location for ${host}: ${location.latitude} ${location.longitude}`)

  const pets = (yield* timeout(petsTimeout, fetchPets<PetsToken>(location, radiusMiles))) || new Error(`Timeout trying to get pets within ${radiusMiles} miles of ${location.city}`)

  if (pets instanceof Error) return { statusCode: 500, body: renderError(pets) }

  yield* log(`pets within ${radiusMiles} of ${location.latitude} ${location.longitude}: ${pets.animals.length}`)

  return {
    statusCode: 200,
    body: renderPets(location, radiusMiles, pets),
    headers: { 'Content-Type': 'text/html;charset=utf-8' }
  }
})

const getHost = (event: APIGatewayProxyEvent): string =>
  event.multiValueHeaders?.['X-Forwarded-For']?.[0]?.split(/,\s*/)[0] ?? event.headers['Host'] ?? ''

