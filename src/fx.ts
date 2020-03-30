import { Env, Capabilities, resumeNow, Resume, Use, Embed, runResume, resume, Cancel, Pure, uncancelable } from './env'

// A Computation is a sequence of effects, each of which requires a set
// of capabilities. Between those effects, there can be any number of
// pure functions.
// To execute an effectful computation, we only need to be able to access
// its effects.  Thus, we can represent a Computation as an Iterable
// over its effects.  This makes it quite natural to implement effectful
// computations by writing a generator function that yields effects.
// Pure code simply executes between the yields.
export interface Fx<Y, R> {
  'fx-ts/Fx': never
  [Symbol.iterator](): Iterator<Y, R, any>
}

export type Yield<C> = C extends Fx<infer Y, any> ? Y : never
export type Return<C> = C extends Fx<any, infer R> ? R : never

type Result<C> = {
  [K in keyof C]: C[K] extends (...a: readonly any[]) => Resume<infer R> ? R : never
}[keyof C]

// Create a Computation from an Env-yielding generator
// allows the computation to be started more than once by calling the
// generator function each time its iterator is requested
export const doFx = <A extends readonly any[], Y, R>(f: (...args: A) => Generator<Y, R, never>): ((...args: A) => Fx<Y, R>) =>
  (...args: A): Fx<Y, R> => ({
    [Symbol.iterator](): Iterator<Y, R, any> { return f(...args) }
  }) as Fx<Y, R>

// Create a Computation from an Env
export const withEnv = <C, A = Result<C>>(env: Env<C, A>): Fx<Env<C, A>, A> => ({
  *[Symbol.iterator](): Iterator<Env<C, A>, A, A> { return yield env }
}) as Fx<Env<C, A>, A>

export const runFx = <Y extends Pure<any>, R>(c: Fx<Y, R>, f: (r: R) => Cancel = () => uncancelable): Cancel =>
  runFxWith(c, {} as never, f)

// Run a computation by satisfying its remaining capability requirements
export const runFxWith = <Y extends Env<any, N>, R, N>(g: Fx<Y, R>, c: Capabilities<Y>, k: (r: R) => Cancel): Cancel =>
  runResume(evalFx(g, c), k)

const evalFx = <Y extends Env<any, N>, R, N>(g: Fx<Y, R>, c: Capabilities<Y>): Resume<R> =>
  resume(k => {
    const i = g[Symbol.iterator]()
    return stepFx(i, i.next(), c, k)
  })

const stepFx = <Y extends Env<any, N>, R, N>(i: Iterator<Y, R, N>, ir: IteratorResult<Y, R>, c: Capabilities<Y>, k: (r: R) => Cancel): Cancel => {
  while (true) {
    if (ir.done) return k(ir.value)

    const r = ir.value(c)
    if (!r.now) return runResume(r, n => stepFx(i, i.next(n), c, k))

    ir = i.next(r.value)
  }
}

// Request a capability by type
export const get = <C>() => withEnv<C, C>(resumeNow)

// Satisfy some or all of a Computation's required capabilities.
export const use = <Y extends Env<any, N>, R, N, C> (cg: Fx<Y, R>, c: C): Fx<Use<Y, C>, R> =>
  withEnv((c0: Capabilities<Use<Y, C>>) => evalFx(cg, { ...c0 as any, ...c })) as Fx<Use<Y, C>, R>

// Adapt a Computation that requires one set of capabilities to
// an environment that provides a different set.
export const embed = <Y extends Env<any, N>, R, N, C>(cg: Fx<Y, R>, f: (c: C) => Capabilities<Y>): Fx<Embed<Y, C>, R> =>
  withEnv((c: C) => evalFx(cg, f(c))) as Fx<Embed<Y, C>, R>
