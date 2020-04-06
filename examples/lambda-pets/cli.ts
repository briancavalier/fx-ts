import { attempt, runFx, uncancelable } from '../../src'
import { env, EnvEffects } from './env'
import { tryGetAdoptablePetsNear } from './src/application/pets'

// Command line entry point of pets app

const ipAddress: string = process.argv[process.argv.length - 1]
const fx = attempt(tryGetAdoptablePetsNear<EnvEffects>(ipAddress))
runFx(fx, env, a => (console.log(a), uncancelable))