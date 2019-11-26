import { Cancel, uncancelable } from "../../src"

export type Queue<A> = { values: A[], consumers: ((a: A) => void)[] }

export const queue = <A> (): Queue<A> => ({ values: [], consumers: [] })

export const queuePut = <A> (a: A, q: Queue<A>): void => {
  if (q.consumers.length === 0) {
    q.values.push(a)
  } else {
    (q.consumers.shift() as (a: A) => void)(a)
  }
}

export const queueTake = <A> (c: (a: A) => void, q: Queue<A>): Cancel => {
  if (q.values.length === 0) {
    q.consumers.push(c)
    return () => {
      const i = q.consumers.indexOf(c)
      if (i >= 0) q.consumers.splice(i, 1)
    }
  } else {
    c(q.values.shift() as A)
    return uncancelable
  }
}