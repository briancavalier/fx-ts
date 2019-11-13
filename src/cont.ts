// Delimited continuation monad with polymorphic answer types
// in the spirit of:
// http://okmij.org/ftp/continuations/implementations.html#genuine-shift
export type Cont<A, R, S> = (k: (a: A) => R) => S

export const pure = <A>(a: A): (<R>(k: (a: A) => R) => R) =>
  k => k(a)

export const cont = <A, R, S>(f: (k: (a: A) => R) => S): Cont<A, R, S> =>
  f

export const chainCont = <A, B, Q, R, S> (ra: Cont<A, R, S>, f: (a: A) => Cont<B, Q, R>): Cont<B, Q, S> =>
  k => ra(a => f(a)(k))
