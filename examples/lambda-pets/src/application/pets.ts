import { attempt, catchAll, doFx, Fx, get, pure, timeout } from '../../../../src'
import { defaultLocation, GetLocation, GetPets } from '../domain/model'
import { renderError, renderPets } from './render'

export type Log<Effects> = (s: string) => Fx<Effects, void>

export type PetsEnv<Effects> = {
  getPets: GetPets<Effects>,
  getLocation: GetLocation<Effects>
  log: Log<Effects>

  radiusMiles: number,
  locationTimeout: number,
  petsTimeout: number
}

const HEADERS = { 'Content-Type': 'text/html;charset=utf-8' }

export const getAdoptablePetsNear = <Effects>(ip: string) => doFx(function* () {
  const petsOrError = yield* attempt(tryGetAdoptablePetsNear<Effects>(ip))
  return petsOrError instanceof Error
    ? { statusCode: 500, body: renderError(petsOrError), headers: HEADERS }
    : { statusCode: 200, body: renderPets(petsOrError), headers: HEADERS }
})

export const tryGetAdoptablePetsNear = <Effects>(ip: string) => doFx(function* () {
  const { radiusMiles, locationTimeout, petsTimeout, log, getLocation, getPets } = yield* get<PetsEnv<Effects>>()

  const location = yield* catchAll(timeout(locationTimeout, getLocation(ip)), () => pure(defaultLocation))

  yield* log(`Geo location for ${ip}: ${location.latitude} ${location.longitude}`)

  const pets = yield* timeout(petsTimeout, getPets(location, radiusMiles))

  yield* log(`Pets within ${radiusMiles} mi of ${location.latitude} ${location.longitude}: ${pets.length}`)

  return { location, radiusMiles, pets }
})
