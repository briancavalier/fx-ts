import { Async, async, Delay } from './async'
import { Resume, resume, resumeNow } from './env'
import { Fx } from './fx'
import { Sync } from './sync'

export const defaultEnv: Sync & Async & Delay = {
  async: resume,
  delay: (ms: number): Fx<Async, void> =>
    async<void>(k => {
      const t = setTimeout(k, ms)
      return () => clearTimeout(t)
    }),
  sync: <A>(run: () => A): Resume<A> => resumeNow(run())
}
