import { Env, resumeNow, Resume, runResume, resume, Cancel, uncancelable, Intersect } from './env'

// Fx represents an effectful computation
// It's a sequence of effects, each of which requires a set of capabilities.
// Between those effects, there can be any number of pure functions.
// To execute an effectful computation, we only need to be able to access
// its effects.  Thus, we can represent an effectful computation as an Iterable
// over its effects.  This makes it quite natural to implement effectful
// computations by writing a generator function that yields effects.
// Pure code simply executes between the yields.
export interface Fx<C, A> extends FxIterable<Env<C, unknown>, A> {}

export interface FxIterable<Y, R> {
  'fx-ts/Fx': never
  [Symbol.iterator](): Iterator<Y, R, unknown>
}

export type Effects<F> = F extends Fx<infer C, any> ? C : never
export type Return<F> = F extends Fx<any, infer A> ? A : never

// Get the type of capabilities required by Envs
export type Capabilities<E extends Env<any, any>> = Intersect<CapabilitiesOf<E>>
type CapabilitiesOf<E> = E extends Env<infer C, any> ? C : never

// do-notation for effects.
// Create an Fx computation from a generator function.
// Crucially, allows the computation to be started more than once by calling the
// generator function each time its iterator is requested
export const doFx = <Y extends Env<any, any>, A extends readonly any[], R>(f: (...args: A) => Generator<Y, R, unknown>): ((...args: A) => Fx<Capabilities<Y>, R>) =>
  (...args) => ({
    [Symbol.iterator](): Iterator<Y, R, unknown> { return f(...args) }
  }) as Fx<Capabilities<Y>, R>

// Extract all possible result types from a set of capabilities
type Result<C> = { [K in keyof C]: C[K] extends (...a: readonly any[]) => Resume<infer R> ? R : never }[keyof C]

// Create a simple effect operation from an Env
export const op = <C, A = Result<C>>(env: Env<C, A>): Fx<C, A> => ({
  *[Symbol.iterator](): Iterator<Env<C, A>, A, A> { return yield env }
}) as Fx<C, A>

// Create an Fx that returns A, with no effects
export const pure = <A>(a: A): Fx<Pure, A> => ({
  *[Symbol.iterator](): Iterator<never, A, A> { return a }
}) as Fx<Pure, A>

// Run an Fx whose capability requirements have all been satisfied
export const runFx = <A>(fx: Fx<Pure, A>, k: (r: A) => Cancel = () => uncancelable): Cancel =>
  runFxWith(fx, {} as Pure, k)

// Run an Fx by providing its remaining capability requirements
export const runFxWith = <CR, CP extends CR, A>(fx: Fx<CR, A>, c: CP, k: (r: A) => Cancel = () => uncancelable): Cancel =>
  runResume(startFx(fx, c), k)

const startFx = <C, R>(g: Fx<C, R>, c: C): Resume<R> =>
  resume(k => {
    const i = g[Symbol.iterator]()
    return stepFx(i, i.next(), c, k)
  })

// Process synchronous and asynchronous effects in constant stack
const stepFx = <C, R>(i: Iterator<Env<C, unknown>, R, unknown>, ir: IteratorResult<Env<C, unknown>, R>, c: C, k: (r: R) => Cancel): Cancel => {
  while (true) {
    if (ir.done) return k(ir.value)

    const r = ir.value(c)
    if (!r.now) return runResume(r, n => stepFx(i, i.next(n), c, k))

    ir = i.next(r.value)
  }
}

// Request part of the environment by type
export const get = <C>() => op<C, C>(resumeNow)

declare const PURE: unique symbol
export interface Pure { [PURE]: true }

export type Use<CR, CP> =
  CP extends CR ? Pure : CR extends CP ? Omit<CR, keyof CP> : CR

// Satisfy some or all of an Fx's required capabilities.
export const use = <CR extends CP, CP, R> (fx: Fx<CR, R>, c: CP): Fx<Use<CR, CP>, R> =>
  op((c0: Use<CR, CP>) => startFx(fx, { ...c0 as any, ...c }))

// Adapt an Fx that requires one set of capabilities to
// an environment that provides a different set.
export const embed = <C0, C1, A>(fx: Fx<C1, A>, f: (c: C0) => C1): Fx<C0, A> =>
  op((c: C0) => startFx(fx, f(c)))// as Fx<C, R>
