import 'source-map-support/register'

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'

import { Async, async, Fx, pure, resume, runFx, uncancelable } from '../../src'
import { getAdoptablePetsNear } from './src/application/pets'
import { httpImpl } from './src/infrastructure/http'
import { getLocation } from './src/infrastructure/ipstack'
import { getPets } from './src/infrastructure/petfinder'

const capabilities = {
  async: resume,

  radiusMiles: Number(process.env.DEFAULT_RADIUS_MILES) || 10,

  locationTimeout: Number(process.env.LOCATION_TIMEOUT) || 500,

  petsTimeout: Number(process.env.PETS_TIMEOUT) || 500,

  ipstackKey: process.env.IPSTACK_KEY || '',

  petfinderAuth: {
    grant_type: 'client_credentials' as const,
    client_id: process.env.PETFINDER_IsD || '',
    client_secret: process.env.PETFINDER_SECRET || ''
  },

  log: (s: string): Fx<unknown, void> => pure(console.log(s)),

  delay: (ms: number): Fx<Async, void> => async(k => {
    const t = setTimeout(k, ms)
    return () => clearTimeout(t)
  }),

  getLocation,

  getPets,

  ...httpImpl
}

type Effects<F> = F extends (...a: any[]) => Fx<infer C, any> ? C : 'hi'

export const handler: APIGatewayProxyHandler = event =>
  new Promise<APIGatewayProxyResult>(resolve => {
    const r = getAdoptablePetsNear<Effects<typeof getLocation>, Effects<typeof getPets>>(event.requestContext.identity.sourceIp)
    runFx(r, capabilities, a => (resolve(a), uncancelable))
  })
