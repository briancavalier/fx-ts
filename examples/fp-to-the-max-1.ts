import { EOL } from 'os'
import { createInterface } from 'readline'

import {
  async, attempt, defaultEnv, doFx, Fx, FxInterface, get, runFx, Sync, sync, timeout, use
} from '../src'

// -------------------------------------------------------------------
// The number guessing game example from
// https://www.youtube.com/watch?v=sxudIMiOo68

// -------------------------------------------------------------------
// Game domain model and interfaces.  The game needs to be able
// to generate a secret within some bounds.  The user will try to
// guess the secret, and the game needs to be able to check whether
// the user's guess matches the secret

type Game = {
  min: number,
  max: number
}

// Generate a secret
type GenerateSecret = { generateSecret(c: Game): FxInterface<number> }

// Core "business logic": evaluate the user's guess
const checkAnswer = (secret: number, guess: number): boolean =>
  secret === guess

// -------------------------------------------------------------------
// The game

// Play one round of the game.  Generate a number and ask the user
// to guess it.
const play = (name: string, config: Game) => doFx(function* ({ generateSecret }: GenerateSecret) {
  const secret = yield* generateSecret(config)
  const result =
    yield* attempt(timeout(3000, ask(`Dear ${name}, please guess a number from ${config.min} to ${config.max}: `)))

  if (typeof result === 'string') {
    const guess = Number(result)
    if (!Number.isInteger(guess)) {
      yield* println('You did not enter an integer!')
    } else {
      if (checkAnswer(secret, guess)) yield* println(`You guessed right, ${name}!`)
      else yield* println(`You guessed wrong, ${name}! The number was: ${secret}`)
    }
  } else {
    yield* println('You took too long!')
  }
})

// Ask the user if they want to play again.
// Note that we keep asking until the user gives an answer we recognize
const checkContinue = (name: string) => doFx(function* () {
  while (true) {
    const answer = yield* ask(`Do you want to continue, ${name}? (y or n) `)

    switch (answer.toLowerCase()) {
      case 'y': return true
      case 'n': return false
    }
  }
})

// Main game loop. Play round after round until the user chooses to quit
const main = doFx(function* () {
  const name = yield* ask('What is your name? ')
  yield* println(`Hello, ${name} welcome to the game!`)

  const config = yield* get<Game>()

  do {
    yield* play(name, config)
  } while (yield* checkContinue(name))

  yield* println(`Thanks for playing, ${name}.`)
})

// -------------------------------------------------------------------
// Infrastructure capabilities the game needs to interact with
// the user, generate a secret, etc.

type Print = { print(s: string): FxInterface<void> }

type Read = { read: FxInterface<string> }

type Random = { random: FxInterface<number> }

// -------------------------------------------------------------------
// Basic operations that use the capabilites

const println = (s: string) => doFx(function* ({ print }: Print) {
  return yield* print(`${s}${EOL}`)
})

const ask = (prompt: string) => doFx(function* ({ print, read }: Print & Read) {
  yield* print(prompt)
  return yield* read
})

// -------------------------------------------------------------------
// Implementations of all the capabilities the game needs.
// The type system will prevent running the game until implementations
// of all capabilities have been provided.
const capabilities = {
  min: 1,
  max: 5,

  generateSecret: ({ min, max }: Game) => doFx(function* ({ random }: Random) {
    return Math.floor(min + (yield* random) * max)
  }),

  print: (s: string): Fx<Sync, void> =>
    sync(() => void process.stdout.write(s)),

  read: async<string>(k => {
    const readline = createInterface({ input: process.stdin })
      .once('line', s => {
        readline.close()
        k(s)
      })
    return () => readline.removeListener('line', k).close()
  }),

  random: sync(Math.random),

  ...defaultEnv,
}

runFx(use(main, capabilities))
