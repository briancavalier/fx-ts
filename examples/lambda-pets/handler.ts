import 'source-map-support/register'

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'

import { runFx, uncancelable } from '../../src'
import { env, EnvEffects } from './env'
import { getAdoptablePetsNear } from './src/application/pets'

// AWS Lambda entry point of pets app

export const handler: APIGatewayProxyHandler = event =>
  new Promise<APIGatewayProxyResult>(resolve => {
    const fx = getAdoptablePetsNear<EnvEffects>(event.requestContext.identity.sourceIp)
    runFx(fx, env, a => (resolve(a), uncancelable))
  })
