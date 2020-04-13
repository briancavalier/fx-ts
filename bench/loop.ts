import { Suite } from 'benchmark'

import { doFx, Fx, None, pure, runFx, uncancelable } from '../src'

const addFx = (x: number): Fx<None, number> => pure(x + 1)

const loopFx = (n: number): Fx<None, number> => doFx(function* () {
  let x = pure(0)
  for (let i = 0; i < n; i++) {
    x = addFx(yield* x)
  }
  return yield* x
})

const addPromise = (x: number): Promise<number> => Promise.resolve(x + 1)

const loopPromise = (n: number): Promise<number> => {
  let x = Promise.resolve(0)
  for (let i = 0; i < n; i++) {
    x = x.then(addPromise)
  }
  return x
}

const addAwait = async (x: number): Promise<number> => x + 1

const loopAwait = async (n: number): Promise<number> => {
  let x = Promise.resolve(0)
  for (let i = 0; i < n; i++) {
    x = addAwait(await x)
  }
  return x
}

const iterations = 1e4
const benchmark = new Suite(`NestedChain ${iterations}`, { minTime: 10000 })

benchmark
  .add(
    'fx',
    (cb: any) => {
      runFx(loopFx(iterations), {}, () => {
        cb.resolve()
        return uncancelable
      })
    },
    { defer: true }
  )
  .add(
    'promise',
    (cb: any) => {
      loopPromise(iterations).then(() => {
        cb.resolve()
      })
    },
    { defer: true }
  )
  .add(
    'await',
    (cb: any) => {
      loopAwait(iterations).then(() => {
        cb.resolve()
      })
    },
    { defer: true }
  )
  .on("cycle", (event: any) => console.log(`${event.target}`))
  .run({ async: true })

// const test = (n: number): void => {
//   const start = Date.now()
//   runFx(loop1(n), {}, x => (console.log(Date.now() - start, x), uncancelable))
// }

// test(1e4)