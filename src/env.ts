// An Env requires a set of capabilities C to compute a result A.
// It would be nice to allow a more polymorphic result instead of
// locking in the answer types to Cancel, Cancel.  I haven't
// figured out a nice way that doesn't cause type issues when
// mixing sync effects and async effects which require cancelability.
export type Env<C, R, A> = (c: C) => Resume<R, A>

// An Env that requires no capabilities, and thus can be run *forall*
// environments.  Thus, Pure is fully parametric in its capabilities.
export interface Pure<R, A> {
  <C>(c: C): Resume<R, A>
}

// Satisfy some or all of an Env's requirements, at the type level.
// Importantly, this evaluates to Pure when all of E's capabilities
// have been satisfied.
export type Use<E, CP> =
  E extends Pure<any, any>
  ? E
  : E extends Env<infer C, infer R, infer A>
    ? CP extends C ? Pure<R, A>
    : C extends CP ? Env<Omit<C, keyof CP>, R, A>
  : E : E

// Change the capabilities of an Env
// Useful for changing the capabilities of Env unions
// Embed<Env<C1, A> | Env<C2, B>, C3> = Env<C3, A> | Env<C3, B>
export type Embed<E, C> =
  E extends Env<any, infer R, infer A>
  ? Env<C, R, A> : never

// Get the type of capabilities required by Envs
export type Capabilities<E> = U2I<CapabilitiesOf<E>>
type U2I<U> =
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never
type CapabilitiesOf<E> = E extends Pure<any, any> ? never : E extends Env<infer C, any, any> ? C : never

// export const pureEnv = <A>(a: A): Pure<A> =>
//   <C>(_: C) => resumeNow(a)

// export const chainEnv = <C1, C2, A, B> (e: Env<C1, A>, f: (a: A) => Env<C2, B>): Env<C1 & C2, B> =>
//   c12 => chainResume(e(c12), a => f(a)(c12))

export type Step<R, A> =
  | { readonly done: true, readonly value: R }
  | { readonly done: false, readonly value: A }

export type Resume<R, A> =
  | { now: true, value: Step<R, A> }
  | { now: false, run: (k: (s: Step<R, A>) => Cancel) => Cancel }

export type Cancel = () => void

export const uncancelable = () => {}

export const resumeNow = <R, A>(value: A): Resume<R, A> =>
  ({ now: true, value: { done: false, value } })

export const done = <R, A>(value: R): Resume<R, A> =>
  ({ now: true, value: { done: true, value } })

export const resume = <R, A>(run: (k: (s: Step<R, A>) => Cancel) => Cancel): Resume<R, A> =>
  ({ now: false, run })

export const resumeLater = <R, A> (run: (k: (a: A) => void) => Cancel): Resume<R, A> =>
  resume(k => {
    let cancel = uncancelable
    cancel = run(a => (cancel = k({ done: false, value: a })))
    return () => cancel()
  })

export const runResume = <R, A> (ra: Resume<R, A>, k: (s: Step<R, A>) => Cancel): Cancel =>
  ra.now ? k(ra.value) : ra.run(k)
