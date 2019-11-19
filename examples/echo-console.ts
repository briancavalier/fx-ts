import { Op, op, pure, cont, use, unsafeRunEffects, co, Result } from '../src'
import { EOL } from 'os'
import { createInterface } from 'readline'

interface Print {
  print (s: string): Result<void>
}

const print = (s: string): Op<Print, void> =>
  op(c => c.print(s))

interface Read {
  read (): Result<string>
}

const read: Op<Read, string> =
  op(c => c.read())

const main = co(function* () {
  while(true) {
    yield* print('> ')
    const s = yield* read
    yield* print(`${s}${EOL}`)
  }
})

const readline = createInterface({
  input: process.stdin
})

const capabilities = {
  print: (s: string): Result<void> =>
    pure(void process.stdout.write(s)),

  read: (): Result<string> =>
    cont(k => {
      readline.once('line', k)  
      return ck => { 
        readline.removeListener('line', k).close()
        return ck()
      }  
    })
}

const c = use(main(), capabilities)

unsafeRunEffects(c)
