<<<<<<< HEAD
import { Env, Capabilities, chainEnv, pureEnv, resumeNow, Resume, Use, Embed, resumeLater, runResume, chainResume } from './env'
=======
import { Env, Capabilities, chainEnv, pureEnv, resumeNow, Resume, Use, Embed, resume, uncancelable, runResume, chainResume } from './env'
>>>>>>> WIP: Refactor runComputation to deal with Resume directly, instead of chainEnv

// A Computation is a sequence of effects, each of which requires a set
// of capabilities. Between those effects, there can be any number of
// pure functions.
// To execute an effectful computation, we only need to be able to access
// its effects.  Thus, we can represent a Computation as an Iterable
// over its effects.  This makes it quite natural to implement effectful
// computations by writing a generator function that yields effects.
// Pure code simply executes between the yields.
export interface Computation<Y, R, N> {
  'fx-ts/Computation': never
  [Symbol.iterator](): Iterator<Y, R, N>
}

export type Yield<C> = C extends Computation<infer Y, any, any> ? Y : never
export type Return<C> = C extends Computation<any, infer R, any> ? R : never
export type Next<C> = C extends Computation<any, any, infer N> ? N : never

type Result<C> = {
  [K in keyof C]: C[K] extends (...a: readonly any[]) => Resume<infer R> ? R : never
}[keyof C]

// Create a Computation from an Env-yielding generator
// allows the computation to be started more than once by calling the
// generator function each time its iterator is requested
export const co = <A extends readonly any[], Y, R, N>(f: (...args: A) => Generator<Y, R, never>): ((...args: A) => Computation<Y, R, N>) =>
  (...args: A): Computation<Y, R, N> => ({
    [Symbol.iterator](): Iterator<Y, R, N> { return f(...args) }
  }) as Computation<Y, R, N>

// Create a Computation from an Env
export const op = <C, A = Result<C>>(env: Env<C, A>): Computation<Env<C, A>, A, A> => ({
  *[Symbol.iterator](): Iterator<Env<C, A>, A, A> { return yield env }
}) as Computation<Env<C, A>, A, A>

export const runComputation = <Y extends Env<any, N>, R, N>(g: Computation<Y, R, N>): Env<Capabilities<Y>, R> =>
  c => {
    const i = g[Symbol.iterator]()
    return stepComputation(i, i.next(), c)
  }

const stepComputation = <Y extends Env<any, N>, R, N>(i: Iterator<Y, R, N>, ir: IteratorResult<Y, R>, c: Capabilities<Y>): Resume<R> => {
  while (true) {
    if (ir.done) return resumeNow(ir.value)

    const r = ir.value(c)
    if (!r.now) return chainResume(r, n => stepComputation(i, i.next(n), c))

    ir = i.next(r.value)
  }
}

// Request a capability by type
export const get = <C>() => op<C, C>(resumeNow)

// Satisfy some or all of a Computation's required capabilities.
export const use = <Y extends Env<any, N>, R, N, C> (cg: Computation<Y, R, N>, c: C): Computation<Use<Y, C>, R, R> =>
  op((c0: Capabilities<Use<Y, C>>) =>
    runComputation(cg)({ ...c0 as any, ...c })) as Computation<Use<Y, C>, R, R>

// Adapt a Computation that requires one set of capabilities to
// an environment that provides a different set.
export const embed = <Y extends Env<any, N>, R, N, C>(cg: Computation<Y, R, N>, f: (c: C) => Capabilities<Y>): Computation<Embed<Y, C>, R, R> =>
  op((c: C) =>
    runComputation(cg)(f(c))) as Computation<Embed<Y, C>, R, R>
