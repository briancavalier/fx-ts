import { PetfinderAuth, getPets } from './petfinder'
import { get, Resume, op, doFx, pure } from '../../../src'
import { APIGatewayProxyEvent } from 'aws-lambda'
import { timeout } from '../../../src/timer'
import { getLocation } from './ipstack'
import { renderPets, renderError } from './render'
import { attempt, catchFail } from '../../../src/fail'
import { defaultLocation } from './model'

export type Log = { log(s: string): Resume<void> }
export const log = (s: string) => op<Log>(c => c.log(s))

export type Config = {
  radiusMiles: number,
  locationTimeout: number,
  petsTimeout: number,
  petfinderAuth: PetfinderAuth,
  ipstackKey: string
}

const HEADERS = { 'Content-Type': 'text/html;charset=utf-8' }

export const getAdoptablePetsNear = doFx(function* (event: APIGatewayProxyEvent) {
  const p = yield* attempt(tryGetAdoptablePetsNear(event))
  return p instanceof Error
    ? { statusCode: 500, body: renderError(p.message), headers: HEADERS }
    : { statusCode: 200, body: p, headers: HEADERS }
})

export const tryGetAdoptablePetsNear = doFx(function* (event: APIGatewayProxyEvent) {
  const { radiusMiles, locationTimeout, petsTimeout } = yield* get<Config>()
  const host = event.requestContext.identity.sourceIp

  const location = yield* catchFail(timeout(locationTimeout, getLocation(host)), () => pure(defaultLocation))

  yield* log(`location for ${host}: ${location.latitude} ${location.longitude}`)

  const pets = yield* timeout(petsTimeout, getPets(location, radiusMiles))

  yield* log(`pets within ${radiusMiles} of ${location.latitude} ${location.longitude}: ${pets.animals.length}`)

  return renderPets(location, radiusMiles, pets)
})
