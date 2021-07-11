import { runFx, uncancelable, use } from '../../src'
import { env } from './env'
import { tryGetAdoptablePetsNear } from './src/application/pets'

// Command line entry point of pets app

const ipAddress: string = process.argv[process.argv.length - 1]

const fx = tryGetAdoptablePetsNear(ipAddress)
const t = use(fx, env)
runFx(t, a => (console.log(a), uncancelable))
