import 'source-map-support/register'

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'

import { runFx, uncancelable, use } from '../../src'
import { env } from './env'
import { getAdoptablePetsNear } from './src/application/pets'

// AWS Lambda entry point of pets app

export const handler: APIGatewayProxyHandler = event =>
  new Promise<APIGatewayProxyResult>(resolve => {
    const fx = getAdoptablePetsNear(event.requestContext.identity.sourceIp)
    runFx(use(fx, env), a => (resolve(a), uncancelable))
  })
