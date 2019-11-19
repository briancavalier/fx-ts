import { Result, pure } from './result'

// An Env requires a set of capabilities C to compute a result A.
// It would be nice to allow a more polymorphic result instead of
// locking in the answer types to Cancel, Cancel.  I haven't
// figured out a nice way that doesn't cause type issues when
// mixing sync effects and async effects which require cancelability.
export type Env<C, A> = (c: C) => Result<A>

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

// Computation wrapper for a Generator that allows the computation
// to be started more than on\ce by calling the generator function each
// time its iterator is requested (whereas generators return `this` each
// time their iterator is requested)
export class GeneratorComputation<A extends readonly any[], Y, R, N> implements Computation<Y, R, N> {
  _type!: Computation<Y, R, N>['_type']
  constructor(public readonly args: A, public readonly f: (...args: A) => Generator<Y, R, N>) {}
  [Symbol.iterator](): Iterator<Y, R, N> {
      return this.f(...this.args)
  }
}

// Computation wrapper to yield a single value.
export class SingletonComputation<Y, A> implements Computation<Y, A, A> {
  _type!: Computation<Y, A, A>['_type']
  constructor(public readonly value: Y) {}
  [Symbol.iterator](): Iterator<Y, A, A> {
    return new SingletonComputationIterator<Y, A>(this.value)
  }
}

export class SingletonComputationIterator<Y, A> implements Iterator<Y, A, A> {
  private done = false
  constructor(public readonly value: Y) {}

  next (a: A): IteratorResult<Y, A> {
    if (this.done) return { done: true, value: a }
    
    this.done = true
    return { done: false, value: this.value }
  }
}

// Get an iterator over a computation's effects.
// Mostly this exists to avoid sprinkling ugly [Symbol.iterator]()
// calls all over the code
export const startComputation = <Y, R, N> (c: Computation<Y, R, N>): Iterator<Y, R, N> =>
  c[Symbol.iterator]()

// Turn an Env-yielding generator into a computation
export const co = <A extends readonly any[], Y, R, N> (f: (...args: A) => Generator<Y, R, never>): ((...args: A) => Computation<Y, R, N>) =>
  (...args) => new GeneratorComputation(args, f)

// Alias for a computation that requires capabilities C
// to produce a result A
export interface Op<C, A> extends Computation<Env<C, A>, A, A> {}

// Turn a single Env into a computation
export const op = <C, A> (env: Env<C, A>): Op<C, A> =>
  new SingletonComputation(env)

// Request a capability by type
export const get = <C>(): Op<C, C> =>
  op(pure)

// Satisfy some or all of an Env's required capabilities, at the type level.
// Importantly, this evaluates to `never` when all E's capabilities
// have been satisfied.  The intuition is that an Env with no requirements
// is pure, and thus a computation that only yields pure Envs is equivalent
// to a computation that never yields any Envs.
export type Use<E, CP> =
  E extends Env<infer C, infer A>
    ? CP extends C ? never
    : C extends CP ? Env<Omit<C, keyof CP>, A>
  : E
  : E

// Satisfy some or all of a Computation's required capabilities.
// Unfortunately, I haven't found a clear way to write the type of
// use in TS notation.  It's type is:
// use: (Computation<E, A, N>, C) => Computation<Use<E, C>, A, N>
export const use = co(function* <E, A, N, C> (cg: Computation<E, A, N>, c: C): Generator<Use<E, C>, A, N> {
    let i = startComputation(cg)
    let ir = i.next()
    while (!ir.done) {
        const x = yield (((c0: any) => (ir.value as any)({ ...c0, ...c })) as Use<E, C>)
        ir = i.next(x)
    }

    return ir.value
})