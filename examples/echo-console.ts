import { doFx, resumeLater, resumeNow, Resume, op, runFxWith, Fx } from '../src'
import { EOL } from 'os'
import { createInterface } from 'readline'

type Print = { print(s: string): Resume<void> }
const print = (s: string): Fx<Print, void> => op(c => c.print(s))

type Read = { read(): Resume<string> }
const read: Fx<Read, string> = op(c => c.read())

const main = doFx(function* () {
  while(true) {
    yield* print('> ')
    const s = yield* read
    yield* print(`${s}${EOL}`)
  }
})

const capabilities = {
  print: (s: string): Resume<void> =>
    resumeNow(void process.stdout.write(s)),

  read: (): Resume<string> =>
    resumeLater(k => {
      const handler = (s: string): void => {
        readline.close()
        k(s)
      }
      const readline = createInterface({ input: process.stdin }).once('line', handler)
      return () => readline.removeListener('line', handler).close()
    })
}

runFxWith(main(), capabilities)
