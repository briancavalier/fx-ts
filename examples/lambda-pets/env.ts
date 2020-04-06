import { Async, async, Effects, Fx, Pure, pure, resume } from '../../src'
import { httpImpl } from './src/infrastructure/http'
import { getLocation } from './src/infrastructure/ipstack'
import { getPets } from './src/infrastructure/petfinder'

export const env = {
  async: resume,

  radiusMiles: Number(process.env.DEFAULT_RADIUS_MILES) || 10,

  locationTimeout: Number(process.env.LOCATION_TIMEOUT) || 1000,

  petsTimeout: Number(process.env.PETS_TIMEOUT) || 2000,

  ipstackKey: process.env.IPSTACK_KEY || '',

  petfinderAuth: {
    grant_type: 'client_credentials' as const,
    client_id: process.env.PETFINDER_ID || '',
    client_secret: process.env.PETFINDER_SECRET || ''
  },

  log: (s: string): Pure<void> => pure(console.log(Date.now(), s)),

  delay: (ms: number): Fx<Async, void> => async(k => {
    const t = setTimeout(k, ms)
    return () => clearTimeout(t)
  }),

  getLocation,

  getPets,

  ...httpImpl
}

export type EffectsOf<F extends (...a: any[]) => any> = Effects<ReturnType<F>>
export type EnvEffects = EffectsOf<typeof getPets> & EffectsOf<typeof getLocation> & EffectsOf<typeof env['log']>
