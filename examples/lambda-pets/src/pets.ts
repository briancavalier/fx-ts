import { PetfinderAuth, getPets } from './petfinder'
import { co, get, Resume, op } from '../../../src'
import { APIGatewayProxyEvent } from 'aws-lambda'
import { timeout } from '../../../src/timer'
import { getLocation } from './ipstack'
import { renderError, renderPets } from './render'

export type Log = { log(s: string): Resume<void> }
export const log = (s: string) => op<Log>(c => c.log(s))

export type Config = {
  radiusMiles: number,
  locationTimeout: number,
  petsTimeout: number,
  petfinderAuth: PetfinderAuth,
  ipstackKey: string
}

export const getAdoptablePetsNear = co(function* (event: APIGatewayProxyEvent) {
  const { radiusMiles, locationTimeout, petsTimeout } = yield* get<Config>()
  const host = getHost(event)

  const location = (yield* timeout(locationTimeout, getLocation(host))) || new Error(`Timeout trying to get location for ${host}`)

  if (location instanceof Error) return { statusCode: 500, body: renderError(location) }

  yield* log(`location for ${host}: ${location.latitude} ${location.longitude}`)

  const pets = (yield* timeout(petsTimeout, getPets(location, radiusMiles))) || new Error(`Timeout trying to get pets within ${radiusMiles} miles of ${location.city}`)

  if (pets instanceof Error) return { statusCode: 500, body: renderError(pets) }

  yield* log(`pets within ${radiusMiles} of ${location.latitude} ${location.longitude}: ${pets.animals.length}`)

  return {
    statusCode: 200,
    body: renderPets(location, radiusMiles, pets),
    headers: { 'Content-Type': 'text/html;charset=utf-8' }
  }
})

const getHost = (event: APIGatewayProxyEvent): string =>
  event.requestContext.identity.sourceIp
