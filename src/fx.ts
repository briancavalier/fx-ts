/* eslint-disable @typescript-eslint/no-explicit-any */
import { Cancel, Env, Intersect, resume, resumeNow, uncancelable } from './env'

export const URI: unique symbol = Symbol('@fx-ts/Fx')

// Fx represents an effectful computation
// It's a sequence of effects, each of which requires a set of capabilities.
// Between those effects, there can be any number of pure functions.
// To execute an effectful computation, we only need to be able to access
// its effects.  Thus, we can represent an effectful computation as an Iterable
// over its effects.  This makes it quite natural to implement effectful
// computations by writing a generator function that yields effects.
// Pure code simply executes between the yields.
export interface Fx<C, A> {
  // URI prevents using a native generator directly as an Fx
  // since native generators are stateful and not referentially transparent
  readonly [URI]: undefined
  [Symbol.iterator](): Iterator<Env<C, unknown>, A, unknown>
}

// An Fx that requires no particular capabilities and produces no effects
export type None = unknown

export type Effects<F> = F extends Fx<infer C, any> ? (unknown extends C ? never : C) : never
export type Return<F> = F extends Fx<any, infer A> ? A : never

// Get the type of capabilities required by Envs
type Capabilities<E extends Env<any, any>> = Intersect<CapabilitiesOf<E>>
type CapabilitiesOf<E> = E extends Env<infer C, any> ? C : never

// do-notation for effects.
// Create an Fx from a generator function.
// Crucially, allows the computation to be started more than once by calling the
// generator function each time its iterator is requested
export const doFx = <C, Y extends Env<any, any>, A>(
  f: (c: C) => Generator<Y, A, unknown>
): Fx<C & Capabilities<Y>, A> => new GenFx(f)

class GenFx<C, Y extends Env<any, any>, A> implements Fx<C & Capabilities<Y>, A> {
  public readonly [URI]: undefined

  constructor(public readonly gen: (c: C) => Generator<Y, A, unknown>) {}
  *[Symbol.iterator](): Iterator<Env<C & Capabilities<Y>, unknown>, A, unknown> {
    return yield* this.gen(yield* get<C>())
  }
}

// Create a simple effect operation from an Env
export const op = <C, A>(env: Env<C, A>): Fx<C, A> => new OpFx(env)

class OpFx<C, A> implements Fx<C, A> {
  public readonly [URI]: undefined

  constructor(public readonly env: Env<C, A>) {}
  *[Symbol.iterator](): Iterator<Env<C, A>, A, A> {
    return yield this.env
  }
}

// Create an Fx that returns A, with no effects and requires
// no particular environment
export const pure = <A>(a: A): Fx<None, A> => new PureFx(a)

class PureFx<A> implements Fx<None, A>, Iterator<never, A, never> {
  public readonly [URI]: undefined
  public readonly done: true = true

  constructor(public readonly value: A) {}
  [Symbol.iterator]() {
    return this
  }
  next() {
    return this
  }
}

// Run an Fx by providing its remaining capability requirements
export const runFx = <C, A>(fx: Fx<C, A>, c: C, k: (r: A) => Cancel = () => uncancelable): Cancel => {
  const i = fx[Symbol.iterator]()
  return stepFx(i, i.next(), c, k)
}

// Process synchronous and asynchronous effects in constant stack
const stepFx = <C, A>(
  i: Iterator<Env<C, unknown>, A, unknown>,
  ir: IteratorResult<Env<C, unknown>, A>,
  c: C,
  k: (r: A) => Cancel
): Cancel => {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (ir.done) return k(ir.value)

    const r = ir.value(c)
    if (!r.now) return r.run((x) => stepFx(i, i.next(x), c, k))

    ir = i.next(r.value)
  }
}

// Request part of the environment by type
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const get = <C>() => op<C, C>(resumeNow)

// Subtract CP from CR
export type Use<CR, CP> = CP extends CR ? None : CR extends CP ? Omit<CR, keyof CP> : CR

// Satisfy some or all of an Fx's required capabilities.
export const use = <CR extends CP, CP, A>(fx: Fx<CR, A>, cp: CP): Fx<Use<CR, CP>, A> =>
  embed(fx, (c: Use<CR, CP>): CR => ({ ...(c as any), ...cp }))

// Adapt an Fx that requires one set of capabilities to
// an environment that provides a different set.
export const embed = <C0, C1, A>(fx: Fx<C1, A>, f: (c: C0) => C1): Fx<C0, A> =>
  op((c0) => resume((k) => runFx(fx, f(c0), k)))
