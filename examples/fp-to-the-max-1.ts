import { EOL } from 'os'
import { createInterface } from 'readline'

import { Async, async, attempt, defaultEnv, doFx, Fx, runFx, Sync, sync, timeout } from '../src'

// -------------------------------------------------------------------
// The number guessing game example from
// https://www.youtube.com/watch?v=sxudIMiOo68

// -------------------------------------------------------------------
// Capabilities the game will need

type Print = { print(s: string): Fx<Sync, void> }

type Read = { read: Fx<Async, string> }

type RandomInt = { randomInt(min: number, max: number): Fx<Sync, number> }

// -------------------------------------------------------------------
// Basic operations that use the capabilites

const println = (s: string) => doFx(function* ({ print }: Print) {
  return yield* print(`${s}${EOL}`)
})

const ask = (prompt: string) => doFx(function* ({ print, read }: Print & Read) {
  yield* print(prompt)
  return yield* read
})

const randomInt = (min: number, max: number) => doFx(function* ({ randomInt }: RandomInt) {
  return yield* randomInt(min, max)
})

// -------------------------------------------------------------------
// The game

// Min/max range for the number guessing game
type GameConfig = {
  min: number,
  max: number
}

// Core "business logic": evaluate the user's guess
const checkAnswer = (secret: number, guess: number): boolean =>
  secret === guess

// Play one round of the game.  Generate a number and ask the user
// to guess it.
const play = (name: string, min: number, max: number) => doFx(function* () {
  const secret = yield* randomInt(min, max)
  const result =
    yield* attempt(timeout(3000, ask(`Dear ${name}, please guess a number from ${min} to ${max}: `)))

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
const main = doFx(function* ({ min, max }: GameConfig) {
  const name = yield* ask('What is your name? ')
  yield* println(`Hello, ${name} welcome to the game!`)

  do {
    yield* play(name, min, max)
  } while (yield* checkContinue(name))

  yield* println(`Thanks for playing, ${name}.`)
})

// -------------------------------------------------------------------
// Implementations of all the capabilities the game needs.
// The type system will prevent running the game until implementations
// of all capabilities have been provided.
const capabilities = {
  min: 1,
  max: 5,

  ...defaultEnv,

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

  randomInt: (min: number, max: number): Fx<Sync, number> =>
    sync(() => Math.floor(min + (Math.random() * (max - min))))
}

runFx(main, capabilities)
