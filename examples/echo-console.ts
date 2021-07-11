import { EOL } from 'os'
import { createInterface } from 'readline'

import { async, defaultEnv, doFx, Fx, FxInterface, runFx, sync, Sync, use } from '../src'

type Print = { print(s: string): FxInterface<void> }

type Read = { read: FxInterface<string> }

const main = doFx(function* ({ print, read }: Print & Read) {
  while (true) {
    yield* print('> ')
    const s = yield* read
    yield* print(`${s}${EOL}`)
  }
})

const capabilities = {
  ...defaultEnv,

  print: (s: string): Fx<Sync, void> =>
    sync(() => void process.stdout.write(s)),

  read: async<string>(k => {
    const handler = (s: string): void => {
      readline.close()
      k(s)
    }
    const readline = createInterface({ input: process.stdin }).once('line', handler)
    return () => readline.removeListener('line', handler).close()
  })
}

const m = use(main, capabilities)

runFx(m)
