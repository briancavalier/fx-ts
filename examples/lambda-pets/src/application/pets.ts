import { attempt, catchAll, Delay, doFx, Fx, pure, Sync, timeout } from '../../../../src'
import { AdoptablePets, defaultLocation } from '../domain/model'
import { HttpEnv } from '../infrastructure/http'
import { getLocation, IpStackConfig } from '../infrastructure/ipstack'
import { getPets, PetfinderConfig } from '../infrastructure/petfinder'
import { renderError, renderPets } from './render'

export type PetsEnv = {
  getPets: typeof getPets,
  getLocation: typeof getLocation
  log: (s: string) => Fx<Sync, void>

  radiusMiles: number,
  locationTimeout: number,
  petsTimeout: number
}

const HEADERS = { 'Content-Type': 'text/html;charset=utf-8' }

export const getAdoptablePetsNear = (ip: string) => doFx(function* () {
  const petsOrError = yield* attempt(tryGetAdoptablePetsNear(ip))
  return petsOrError instanceof Error
    ? { statusCode: 500, body: renderError(petsOrError), headers: HEADERS }
    : { statusCode: 200, body: renderPets(petsOrError), headers: HEADERS }
})

export const tryGetAdoptablePetsNear = (ip: string): Fx<PetsEnv & HttpEnv & Delay & Sync & IpStackConfig & PetfinderConfig, AdoptablePets> => doFx(function* ({ radiusMiles, locationTimeout, petsTimeout, log, getLocation, getPets }) {
  const location = yield* catchAll(timeout(locationTimeout, getLocation(ip)), () => pure(defaultLocation))

  yield* log(`Geo location for ${ip}: ${location.latitude} ${location.longitude}`)

  const pets = yield* timeout(petsTimeout, getPets(location, radiusMiles))

  yield* log(`Pets within ${radiusMiles} mi of ${location.latitude} ${location.longitude}: ${pets.length}`)

  return { location, radiusMiles, pets }
})
