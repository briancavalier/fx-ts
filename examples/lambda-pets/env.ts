import { defaultEnv, Fx, Sync, sync } from '../../src'
import { httpEnv } from './src/infrastructure/http'
import { getLocation } from './src/infrastructure/ipstack'
import { getPets } from './src/infrastructure/petfinder'

export const env = {
  ...defaultEnv,
  ...httpEnv,

  radiusMiles: Number(process.env.DEFAULT_RADIUS_MILES) || 10,

  locationTimeout: Number(process.env.LOCATION_TIMEOUT) || 1000,

  petsTimeout: Number(process.env.PETS_TIMEOUT) || 2000,

  ipstackKey: process.env.IPSTACK_KEY || '',

  petfinderAuth: {
    grant_type: 'client_credentials' as const,
    client_id: process.env.PETFINDER_ID || '',
    client_secret: process.env.PETFINDER_SECRET || ''
  },

  log: (s: string): Fx<Sync, void> => sync(() => console.log(Date.now(), s)),

  getLocation,

  getPets
}
