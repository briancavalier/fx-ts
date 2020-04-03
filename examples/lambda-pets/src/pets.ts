import { PetfinderAuth, getPets } from './petfinder'
import { get, doFx, pure, Fx } from '../../../src'
import { APIGatewayProxyEvent } from 'aws-lambda'
import { timeout } from '../../../src/async'
import { getLocation } from './ipstack'
import { renderPets, renderError } from './render'
import { attempt, catchAll } from '../../../src/fail'
import { defaultLocation } from './model'

export type Log = { log(s: string): Fx<never, void> }

export type Config = {
  radiusMiles: number,
  locationTimeout: number,
  petsTimeout: number,
  petfinderAuth: PetfinderAuth,
  ipstackKey: string
}

const HEADERS = { 'Content-Type': 'text/html;charset=utf-8' }

export const getAdoptablePetsNear = (event: APIGatewayProxyEvent) => doFx(function* () {
  const p = yield* attempt(tryGetAdoptablePetsNear(event))
  return p instanceof Error
    ? { statusCode: 500, body: renderError(p.message), headers: HEADERS }
    : { statusCode: 200, body: p, headers: HEADERS }
})

export const tryGetAdoptablePetsNear = (event: APIGatewayProxyEvent) => doFx(function* () {
  const { radiusMiles, locationTimeout, petsTimeout, log } = yield* get<Config & Log>()
  const host = event.requestContext.identity.sourceIp

  const location = yield* catchAll(timeout(locationTimeout, getLocation(host)), () => pure(defaultLocation))

  yield* log(`location for ${host}: ${location.latitude} ${location.longitude}`)

  const pets = yield* timeout(petsTimeout, getPets(location, radiusMiles))

  yield* log(`pets within ${radiusMiles} of ${location.latitude} ${location.longitude}: ${pets.animals.length}`)

  return renderPets(location, radiusMiles, pets)
})
