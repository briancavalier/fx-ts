import { APIGatewayProxyEvent } from 'aws-lambda'

import { attempt, catchAll, doFx, Fx, get, pure, timeout } from '../../../../src'
import { defaultLocation, GetLocation, GetPets, Location, Pets } from '../domain/model'
import { renderError, renderPets } from './render'

export type Log = { log(s: string): Fx<unknown, void> }

export type Config = {
  radiusMiles: number,
  locationTimeout: number,
  petsTimeout: number
}

export type AdoptablePetsNear = {
  location: Location,
  radiusMiles: number,
  pets: Pets
}

const HEADERS = { 'Content-Type': 'text/html;charset=utf-8' }

export const getAdoptablePetsNear = <C>(event: APIGatewayProxyEvent) => doFx(function* () {
  const petsOrError = yield* attempt(tryGetAdoptablePetsNear<C>(event))
  return petsOrError instanceof Error
    ? { statusCode: 500, body: renderError(petsOrError), headers: HEADERS }
    : { statusCode: 200, body: renderPets(petsOrError), headers: HEADERS }
})

export const tryGetAdoptablePetsNear = <C>(event: APIGatewayProxyEvent) => doFx(function* () {
  const { radiusMiles, locationTimeout, petsTimeout, log } = yield* get<Config & Log>()
  const { getLocation } = yield* get<GetLocation<C>>()
  const { getPets } = yield* get<GetPets<C>>()

  const host = event.requestContext.identity.sourceIp

  const location = yield* catchAll(timeout(locationTimeout, getLocation(host)), () => pure(defaultLocation))

  yield* log(`location for ${host}: ${location.latitude} ${location.longitude}`)

  const pets = yield* timeout(petsTimeout, getPets(location, radiusMiles))

  yield* log(`pets within ${radiusMiles} of ${location.latitude} ${location.longitude}: ${pets.animals.length}`)

  return { location, radiusMiles, pets }
})
