import { Fx, op, runFxWith, Use } from './fx'
import { Resume, resume } from './env'

export type Fail<E> = { fail(e: E): Resume<never> }

export const fail = <E>(e: E) => op<Fail<E>>(c => c.fail(e))

export const attempt = <C extends Fail<any>, A>(co: Fx<C, A>) =>
  op((c): Resume<A | void> => resume(k => {
    const handleRaise = {
      fail: () => (cancel(), resume(_ => k()))
    }
    const cancel = runFxWith(co, { ...c as any, ...handleRaise }, k)
    return cancel
  })) as Fx<Use<C, Fail<unknown>>, A | void>
