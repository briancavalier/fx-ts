// An Env requires a set of capabilities C to compute a result A.
// It would be nice to allow a more polymorphic result instead of
// locking in the answer types to Cancel, Cancel.  I haven't
// figured out a nice way that doesn't cause type issues when
// mixing sync effects and async effects which require cancelability.
export type Env<C, A> = (c: C) => Resume<A>

export type Intersect<U> =
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never

export type Resume<A> =
  | { now: true, value: A }
  | { now: false, run: (k: (a: A) => Cancel) => Cancel }

export type Cancel = () => void

export const uncancelable = () => {}

export const resumeNow = <A>(value: A): Resume<A> =>
  ({ now: true, value })

export const resume = <A>(run: (k: (a: A) => Cancel) => Cancel): Resume<A> =>
  ({ now: false, run })

export const resumeLater = <A> (run: (k: (a: A) => void) => Cancel): Resume<A> =>
  resume(k => {
    let cancel = uncancelable
    cancel = run(a => (cancel = k(a)))
    return () => cancel()
  })

export const runResume = <A> (ra: Resume<A>, k: (a: A) => Cancel): Cancel =>
  ra.now ? k(ra.value) : ra.run(k)
