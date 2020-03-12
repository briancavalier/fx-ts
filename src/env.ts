// An Env requires a set of capabilities C to compute a result A.
// It would be nice to allow a more polymorphic result instead of
// locking in the answer types to Cancel, Cancel.  I haven't
// figured out a nice way that doesn't cause type issues when
// mixing sync effects and async effects which require cancelability.
export type Env<C, A> = (c: C) => Resume<A>

// An Env that requires no capabilities, and thus can be run *forall*
// environments.  Thus, Pure is fully parametric in its capabilities.
export interface Pure<A> {
  <C>(c: C): Resume<A>
}

// Satisfy some or all of an Env's requirements, at the type level.
// Importantly, this evaluates to Pure when all of E's capabilities
// have been satisfied.
export type Use<E, CP> =
  E extends Pure<any>
  ? E
  : E extends Env<infer C, infer A>
    ? CP extends C ? Pure<A>
    : C extends CP ? Env<Omit<C, keyof CP>, A>
  : E : E

// Change the capabilities of an Env
// Useful for changing the capabilities of Env unions
// Embed<Env<C1, A> | Env<C2, B>, C3> = Env<C3, A> | Env<C3, B>
export type Embed<E, C> =
  E extends Env<any, infer A>
  ? Env<C, A> : never

// Get the type of capabilities required by Envs
export type Capabilities<E> = U2I<CapabilitiesOf<E>>
type U2I<U> =
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never
type CapabilitiesOf<E> = E extends Pure<any> ? never : E extends Env<infer C, any> ? C : never

export const pureEnv = <A>(a: A): Pure<A> =>
  <C>(_: C) => resumeNow(a)

export const chainEnv = <C1, C2, A, B> (e: Env<C1, A>, f: (a: A) => Env<C2, B>): Env<C1 & C2, B> =>
  c12 => chainResume(e(c12), a => f(a)(c12))

export type Resume<A> =
  | { now: true, value: A }
  | { now: false, run: (k: (a: A) => void) => Cancel }

export type Cancel = () => void

export const uncancelable = () => {}

export const resumeNow = <A>(value: A): Resume<A> =>
  ({ now: true, value })

export const resumeLater = <A> (run: (k: (a: A) => void) => Cancel): Resume<A> =>
  ({ now: false, run })

export const runResume = <A> (ra: Resume<A>, k: (a: A) => void): Cancel =>
  ra.now ? (k(ra.value), uncancelable) : ra.run(k)

export const chainResume = <A, B>(ra: Resume<A>, f: (a: A) => Resume<B>): Resume<B> =>
  ra.now ? f(ra.value) : resumeLater(k => {
    let cancel: Cancel = uncancelable
    cancel = ra.run((a: A) => (cancel = runResume(f(a), k)))
    return () => cancel()
  })
