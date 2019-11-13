export class Cont<A, R, S> {
  constructor(public readonly runCont: (k: (a: A) => R) => S) {}
}

export const pure = <A, R>(a: A): Cont<A, R, R> =>
  new Cont((k => k(a)))

export const cont = <A, R, S>(f: (k: (a: A) => R) => S): Cont<A, R, S> =>
  new Cont(f)

export const chainCont = <A, B, Q, R, S> (ra: Cont<A, R, S>, f: (a: A) => Cont<B, Q, R>): Cont<B, Q, S> =>
  new Cont(k => ra.runCont(a => f(a).runCont(k)))
