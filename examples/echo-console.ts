import { op, co, unsafeRunEffects, Resume, resumeLater, resumeNow, use } from '../src'
import { EOL } from 'os'
import { createInterface } from 'readline'

interface Print {
  print (s: string): Resume<void>
}

const print = (s: string) => op<Print, void>(c => c.print(s))

interface Read {
  read (): Resume<string>
}

const read = op<Read, string>(c => c.read())

const main = co(function* () {
  while(true) {
    yield* print('> ')
    const s = yield* read
    yield* print(`${s}${EOL}`)
  }
})

const capabilities = {
  print: (s: string) =>
    resumeNow<void>(void process.stdout.write(s)),

  read: () =>
    resumeLater<string>(k => {
      const readline = createInterface({
        input: process.stdin
      })

      readline.once('line', k)  
      return () => {
        readline.removeListener('line', k).close()
      }
    })
}

unsafeRunEffects(use(main(), capabilities))
