import { co, unsafeRun, resumeLater, resumeNow, use, Resume, op } from '../src'
import { EOL } from 'os'
import { createInterface } from 'readline'

type Print = { print(s: string): Resume<never, void> }
const print = (s: string) => op<Print>(c => c.print(s))

type Read = { read(): Resume<never, string> }
const read = op<Read>(c => c.read())

const main = co(function* () {
  while(true) {
    yield* print('> ')
    const s = yield* read
    yield* print(`${s}${EOL}`)
  }
})

const capabilities = {
  print: (s: string): Resume<never, void> =>
    resumeNow(void process.stdout.write(s)),

  read: (): Resume<never, string> =>
    resumeLater(k => {
      const handler = (s: string): void => {
        readline.close()
        k(s)
      }
      const readline = createInterface({ input: process.stdin }).once('line', handler)
      return () => readline.removeListener('line', handler).close()
    })
}
const m = use(main(), capabilities)

unsafeRun(m)
