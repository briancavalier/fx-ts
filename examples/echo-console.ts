import { Op, op, pure, Cancel, cont, use, unsafeRunEffects } from '../src'
import { EOL } from 'os'
import { createInterface } from 'readline'

interface Print {
  print (s: string): void
}

const print = (s: string): Op<Print, void> =>
  op(c => pure(c.print(s)))

interface Read {
  read (k: (s: string) => unknown): Cancel
}

const read: Op<Read, string> =
  op(c => cont(c.read))

function *main () {
  while(true) {
    yield* print('> ')
    const s = yield* read
    yield* print(`${s}${EOL}`)
  }
}

const readline = createInterface({
  input: process.stdin
})

const capabilities = {
  print (s: string): void {
    process.stdout.write(s)
  },
  read (k: (s: string) => unknown): Cancel {
    readline.once('line', k)  
    return ck => { 
      readline.removeListener('line', k).close()
      return ck()
    }
  }
}

const c = use(main(), capabilities)

unsafeRunEffects(c)
