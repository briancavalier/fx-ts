import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'
import 'source-map-support/register'

import { Resume, unsafeRun, resumeNow, use, resumeLater } from '../../src'
import { httpImpl } from './src/http'
import { getAdoptablePetsNear } from './src/pets'

const capabilities = {
  radiusMiles: Number(process.env.DEFAULT_RADIUS_MILES) || 10,

  locationTimeout: Number(process.env.LOCATION_TIMEOUT) || 500,

  petsTimeout: Number(process.env.PETS_TIMEOUT) || 500,

  ipstackKey: process.env.IPSTACK_KEY || '',

  petfinderAuth: {
    grant_type: 'client_credentials' as const,
    client_id: process.env.PETFINDER_ID || '',
    client_secret: process.env.PETFINDER_SECRET || ''
  },

  log: (s: string) => resumeNow(console.log(s)),

  delay: (ms: number): Resume<void> => resumeLater(k => {
    const t = setTimeout(k, ms)
    return () => clearTimeout(t)
  }),

  ...httpImpl
}

export const handler: APIGatewayProxyHandler = event =>
  new Promise<APIGatewayProxyResult>(resolve =>
    unsafeRun(use(getAdoptablePetsNear(event), capabilities), resolve))

