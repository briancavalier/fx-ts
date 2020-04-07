import { EOL } from 'os'
import { createInterface } from 'readline'

import { Async, async, defaultAsync, doFx, Fx, get, Pure, pure, resume, runFx } from '../src'

type Print = { print(s: string): Pure<void> }

type Read = { read: Fx<Async, string> }

const main = doFx(function* () {
  const { print, read } = yield* get<Print & Read>()
  while (true) {
    yield* print('> ')
    const s = yield* read
    yield* print(`${s}${EOL}`)
  }
})

const capabilities = {
  ...defaultAsync,

  print: (s: string): Pure<void> =>
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
