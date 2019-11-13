import { Op, op, pure, Cancel, cont, use, run, Cont } from '../src'
import { EOL } from 'os'
import { createInterface } from 'readline'

interface Async {
  runAsync <A>(f: (k: (a: A) => void) => Cancel): Cont<A, Cancel, Cancel>
}

interface Print {
  print(s: string): void
}

const print = (s: string): Op<Print, void> =>
  op(c => pure(c.print(s)))

interface Read {
  read (k: (s: string) => void): Cancel
}

const read: Op<Read & Async, string> =
  op(c => c.runAsync(c.read))

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

const c = use(main(), {
  runAsync <A>(f: (k: (a: A) => void) => Cancel): Cont<A, Cancel, Cancel> {
    return cont(k => f(k))
  },
  print (s: string): void {
    process.stdout.write(s)
  },
  read (k: (s: string) => void): Cancel {
    readline.once('line', k)  
    return ck => { 
      readline.removeListener('line', k)
      readline.close()
      return ck()
    }
  }
})

const r = run(c)

const cancel = r.runCont(a => () => {})
