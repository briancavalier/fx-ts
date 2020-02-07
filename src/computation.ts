import { Env, Capabilities, chainEnv, pureEnv, resumeNow, Resume } from './env'

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

// Create a Computation from an Env-yielding generator
// allows the computation to be started more than on\ce by calling the
// generator function each time its iterator is requested (whereas
// generators return `this` each time their iterator is requested)
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
  ir.done ? pureEnv(ir.value) : chainEnv(ir.value, n => stepComputation(i, i.next(n)))

// Get an iterator over a computation's effects.
// Mostly this exists to avoid sprinkling ugly [Symbol.iterator]()
// calls all over the code
export const startComputation = <Y, R, N> (c: Computation<Y, R, N>): Iterator<Y, R, N> =>
  c[Symbol.iterator]()

type Result<C> = {
  [K in keyof C]: C[K] extends (...a: readonly any[]) => Resume<infer R> ? R : never
}[keyof C]

export function op<C>(env: Env<C, Result<C>>): Computation<Env<C, Result<C>>, Result<C>, Result<C>>
export function op<C, R>(env: Env<C, R>): Computation<Env<C, R>, R, R>
export function op<C, R>(env: Env<C, R>): Computation<Env<C, R>, R, R> {
  return fromEnv(env)
}
// export const op = <C, R = Result<C>>(env: Env<C, R>): Computation<Env<C, R>, R, R> =>
//   fromEnv(env)

// Request a capability by type
export const get = <C>() => fromEnv<C, C>(resumeNow)

// Satisfy some or all of an Env's required capabilities, at the type level.
// Importantly, this evaluates to `never` when all E's capabilities
// have been satisfied.  The intuition is that an Env with no requirements
// is pure, and thus a computation that only yields pure Envs is equivalent
// to a computation that never yields any Envs.
export type Use<E, CP> =
  E extends Env<infer C, infer A>
    ? CP extends C ? Env<void, A>
    : C extends CP ? Env<Omit<C, keyof CP>, A>
  : E : E

export interface Pure<A> extends Env<void, A> {}

// Satisfy some or all of a Computation's required capabilities.
export const use = <Y extends Env<any, N>, R, N, C> (cg: Computation<Y, R, N>, c: C): Computation<Use<Y, C>, R, R> =>
  fromEnv((c0: Capabilities<Use<Y, C>>) =>
    runComputation(cg)({ ...c0 as any, ...c } as Capabilities<Y>)) as unknown as Computation<Use<Y, C>, R, R>
