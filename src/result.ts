export type Cancel = (k: (e?: Error) => void) => void

export class Now<A> {
  constructor (public readonly value: A) {}
}

export const pure = <A>(a: A): Now<A> =>
  new Now(a)

export class Later<R, A> {
  constructor (public readonly run: (k: (a: A) => R) => R) {}
}

export const cont = <R, A> (f: (k: (a: A) => R) => R): Later<R, A> =>
  new Later(f)

export type Result<A> = Now<A> | Later<Cancel, A>

export const runResult = <A> (ra: Result<A>, k: (a: A) => Cancel): Cancel =>
  ra instanceof Later ? ra.run(k) : k(ra.value)

export const chainResult = <A, B>(ra: Result<A>, f: (a: A) => Result<B>): Result<B> =>
  ra instanceof Later
    ? new Later(k => ra.run((a: A) => runResult(f(a), k)))
    : f(ra.value)