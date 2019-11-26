export type Cancel = () => void

export const uncancelable = () => {}

// An Env requires a set of capabilities C to compute a result A.
// It would be nice to allow a more polymorphic result instead of
// locking in the answer types to Cancel, Cancel.  I haven't
// figured out a nice way that doesn't cause type issues when
// mixing sync effects and async effects which require cancelability.
export type Env<C, A> = (c: C) => Resume<A>

type U2I<U> =
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never

// Get the type of capabilities required by Envs
export type Capabilities<E> = U2I<CapabilitiesOf<E>>
type CapabilitiesOf<E> = E extends Env<infer C, any> ? C : never

export const pureEnv = <A>(a: A): Env<any, A> =>
  _ => resumeNow(a)

export const chainEnv = <C1, C2, A, B> (e: Env<C1, A>, f: (a: A) => Env<C2, B>): Env<C1 & C2, B> =>
  c12 => chainResume(e(c12), a => f(a)(c12))

export class ResumeNow<A> {
  constructor (public readonly value: A) {}
}

export const resumeNow = <A>(a: A): Resume<A> =>
  new ResumeNow(a)

export class ResumeLater<A> {
  constructor (public readonly run: (k: (a: A) => Cancel) => Cancel) {}
}

export const resumeLater = <A> (f: (k: (a: A) => Cancel) => Cancel): Resume<A> =>
  new ResumeLater<A>(f)

export type Resume<A> = ResumeNow<A> | ResumeLater<A>

export const runResume = <A> (ra: Resume<A>, k: (a: A) => Cancel): Cancel =>
  ra instanceof ResumeLater ? ra.run(k) : k(ra.value)

export const chainResume = <A, B>(ra: Resume<A>, f: (a: A) => Resume<B>): Resume<B> =>
  ra instanceof ResumeLater
    ? new ResumeLater(k => ra.run((a: A) => runResume(f(a), k)))
    : f(ra.value)