import { PetfinderAuth, getPets } from './petfinder'
import { get, Resume, op, doFx } from '../../../src'
import { APIGatewayProxyEvent } from 'aws-lambda'
import { timeout } from '../../../src/timer'
import { getLocation } from './ipstack'
import { renderPets, renderError } from './render'
import { attempt } from '../../../src/fail'

export type Log = { log(s: string): Resume<void> }
export const log = (s: string) => op<Log>(c => c.log(s))

export type Config = {
  radiusMiles: number,
  locationTimeout: number,
  petsTimeout: number,
  petfinderAuth: PetfinderAuth,
  ipstackKey: string
}

export const getAdoptablePetsNear = doFx(function* (event: APIGatewayProxyEvent) {
  const p = yield* attempt(tryGetAdoptablePetsNear(event))
  return p || { statusCode: 500, body: renderError() }
})

export const tryGetAdoptablePetsNear = doFx(function* (event: APIGatewayProxyEvent) {
  const { radiusMiles, locationTimeout, petsTimeout } = yield* get<Config>()
  const host = getHost(event)

  const location = yield* timeout(locationTimeout, getLocation(host))

  yield* log(`location for ${host}: ${location.latitude} ${location.longitude}`)

  const pets = yield* timeout(petsTimeout, getPets(location, radiusMiles))

  yield* log(`pets within ${radiusMiles} of ${location.latitude} ${location.longitude}: ${pets.animals.length}`)

  return {
    statusCode: 200,
    body: renderPets(location, radiusMiles, pets),
    headers: { 'Content-Type': 'text/html;charset=utf-8' }
  }
})

const getHost = (event: APIGatewayProxyEvent): string =>
  event.requestContext.identity.sourceIp
