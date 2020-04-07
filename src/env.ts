// An Env requires a set of capabilities C to compute a result A.
// Allows using a continuation for flexibility or returning directly
// for efficiency and stack safety.
export type Env<C, A> = (c: C) => Resume<A>

export type Intersect<U> =
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never

export type Resume<A> =
  | { now: true, value: A }
  | { now: false, run: (k: (a: A) => Cancel) => Cancel }

export type Cancel = () => void

export const uncancelable = () => { }

export const resumeNow = <A>(value: A): Resume<A> =>
  ({ now: true, value })

export const resume = <A>(run: (k: (a: A) => Cancel) => Cancel): Resume<A> =>
  ({
    now: false,
    run: k => {
      let cancel = uncancelable
      cancel = run(a => (cancel = k(a)))
      return () => cancel()
    }
  })

export const runResume = <A>(ra: Resume<A>, k: (a: A) => Cancel): Cancel =>
  ra.now ? k(ra.value) : ra.run(k)
