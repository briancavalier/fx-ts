import { Env, Capabilities, chainEnv, pureEnv, resumeNow, Resume, Use } from './env'

// A Computation is a sequence of effects, each of which requires a set
// of capabilities. Between those effects, there can be any number of
// pure functions.
// To execute an effectful computation, we only need to be able to access
// its effects.  Thus, we can represent a Computation as an Iterable
// over its effects.  This makes it quite natural to implement effectful
// computations by writing a generator function that yields effects.
// Pure code simply executes between the yields.
export interface Computation<Y, R, N> {
  _type: 'fx-ts/Computation'
  [Symbol.iterator](): Iterator<Y, R, N>
}

export type Yield<C> = C extends Computation<infer Y, any, any> ? Y : never
export type Return<C> = C extends Computation<any, infer R, any> ? R : never
export type Next<C> = C extends Computation<any, any, infer N> ? N : never

// Create a Computation from an Env-yielding generator
// allows the computation to be started more than once by calling the
// generator function each time its iterator is requested
export const co = <A extends readonly any[], Y, R, N>(f: (...args: A) => Generator<Y, R, never>): ((...args: A) => Computation<Y, R, N>) =>
  (...args) => ({
    _type: 'fx-ts/Computation',
    [Symbol.iterator](): Iterator<Y, R, N> { return f(...args) }
  })

// Create a Computation from an Env
export const fromEnv = <C, A>(env: Env<C, A>): Computation<Env<C, A>, A, A> => ({
  _type: 'fx-ts/Computation',
  *[Symbol.iterator](): Iterator<Env<C, A>, A, A> { return yield env }
})

export const runComputation = <Y extends Env<any, N>, R, N> (g: Computation<Y, R, N>): Env<Capabilities<Y>, R> => {
  const i = startComputation(g)
  return stepComputation(i, i.next())
}

const stepComputation = <Y extends Env<any, N>, R, N> (i: Iterator<Y, R, N>, ir: IteratorResult<Y, R>): Env<Capabilities<Y>, R> =>
  ir.done ? pureEnv(ir.value) as Env<Capabilities<Y>, R> : chainEnv(ir.value, n => stepComputation(i, i.next(n)))

// Get an iterator over a computation's effects.
// Mostly this exists to avoid sprinkling ugly [Symbol.iterator]() everywhere
export const startComputation = <Y, R, N> (c: Computation<Y, R, N>): Iterator<Y, R, N> =>
  c[Symbol.iterator]()

type Result<C> = {
  [K in keyof C]: C[K] extends (...a: readonly any[]) => Resume<infer R> ? R : never
}[keyof C]

export const op = <C, R = Result<C>>(env: Env<C, R>): Computation<Env<C, R>, R, R> =>
  fromEnv(env)

// Request a capability by type
export const get = <C>() => fromEnv<C, C>(resumeNow)

// Satisfy some or all of a Computation's required capabilities.
export const use = <Y extends Env<any, N>, R, N, C> (cg: Computation<Y, R, N>, c: C): Computation<Use<Y, C>, R, R> =>
  fromEnv((c0: Capabilities<Use<Y, C>>) =>
    runComputation(cg)({ ...c0 as any, ...c })) as Computation<Use<Y, C>, R, R>
