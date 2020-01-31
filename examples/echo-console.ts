import { effect, co, unsafeRunEffects, resumeLater, resumeNow, use, Resume } from '../src'
import { EOL } from 'os'
import { createInterface } from 'readline'

const print = (s: string) => effect<'print', void, [string]>(c => c.print(s))
const read = effect<'read', string>(c => c.read())

const main = co(function* () {
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
      const readline = createInterface({ input: process.stdin }).once('line', s => {
        readline.close()
        k(s)
      })  
      return () => readline.removeListener('line', k).close()
    })
}
const m = use(main(), capabilities)

unsafeRunEffects(m)
