import { Cancel, Env, Intersect, Resume, resume, resumeNow, runResume, uncancelable } from './env'

// Fx represents an effectful computation
// It's a sequence of effects, each of which requires a set of capabilities.
// Between those effects, there can be any number of pure functions.
// To execute an effectful computation, we only need to be able to access
// its effects.  Thus, we can represent an effectful computation as an Iterable
// over its effects.  This makes it quite natural to implement effectful
// computations by writing a generator function that yields effects.
// Pure code simply executes between the yields.
export interface Fx<C, A> extends FxIterable<Env<C, unknown>, A> { }

// An Fx that requires no particular capabilities and produces no effects
export interface Pure<A> extends Fx<unknown, A> { }

export interface FxIterable<Y, R> {
  'fx-ts/Fx': never
  [Symbol.iterator](): Iterator<Y, R, unknown>
}

export type Effects<F> = F extends Fx<infer C, any> ? C : never
export type Return<F> = F extends Fx<any, infer A> ? A : never

// Get the type of capabilities required by Envs
type Capabilities<E extends Env<any, any>> = Intersect<CapabilitiesOf<E>>
type CapabilitiesOf<E> = E extends Env<infer C, any> ? C : never

// do-notation for effects.
// Create an Fx computation from a generator function.
// Crucially, allows the computation to be started more than once by calling the
// generator function each time its iterator is requested
export const doFx = <Y extends Env<any, any>, R>(f: () => Generator<Y, R, unknown>): Fx<Capabilities<Y>, R> => ({
  [Symbol.iterator]: f as () => Iterator<Y, R, unknown>
}) as Fx<Capabilities<Y>, R>

// Create a simple effect operation from an Env
export const op = <C, A>(env: Env<C, A>): Fx<C, A> => ({
  *[Symbol.iterator](): Iterator<Env<C, A>, A, A> { return yield env }
}) as Fx<C, A>

// Create an Fx that returns A, with no effects and requires
// no particular environment
export const pure = <A>(a: A): Pure<A> => ({
  *[Symbol.iterator](): Iterator<never, A, A> { return a }
}) as Pure<A>

// Run an Fx by providing its remaining capability requirements
export const runFx = <C, A>(fx: Fx<C, A>, c: C, k: (r: A) => Cancel = () => uncancelable): Cancel =>
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
    if (!r.now) return r.run(n => stepFx(i, i.next(n), c, k))

    ir = i.next(r.value)
  }
}

// Request part of the environment by type
export const get = <C>() => op<C, C>(resumeNow)

// Subtract CP from CR
export type Use<CR, CP> =
  CP extends CR ? unknown : CR extends CP ? Omit<CR, keyof CP> : CR

// Satisfy some or all of an Fx's required capabilities.
export const use = <CR extends CP, CP, R>(fx: Fx<CR, R>, cp: CP): Fx<Use<CR, CP>, R> =>
  op(c => startFx(fx, { ...c as any, ...cp }))

// Adapt an Fx that requires one set of capabilities to
// an environment that provides a different set.
export const embed = <C0, C1, A>(fx: Fx<C1, A>, f: (c: C0) => C1): Fx<C0, A> =>
  op(c0 => startFx(fx, f(c0)))
