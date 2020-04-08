import { EOL } from 'os'
import { createInterface } from 'readline'

import { Async, async, defaultAsyncEnv, doFx, Fx, get, None, pure, runFx } from '../src'

type Print = { print(s: string): Fx<None, void> }

type Read = { read: Fx<Async, string> }

const main = doFx(function* ({ print, read }: Print & Read) {
  while (true) {
    yield* print('> ')
    const s = yield* read
    yield* print(`${s}${EOL}`)
  }
})

const capabilities = {
  ...defaultAsyncEnv,

  print: (s: string): Fx<None, void> =>
    pure(void process.stdout.write(s)),

  read: async<string>(k => {
    const handler = (s: string): void => {
      readline.close()
      k(s)
    }
    const readline = createInterface({ input: process.stdin }).once('line', handler)
    return () => readline.removeListener('line', handler).close()
  })
}

runFx(main, capabilities)
