import { co, get, unsafeRun, Resume, resumeNow, resumeLater, use, op } from '../src'
import { delay, timeout } from '../src/timer'
import { createInterface } from 'readline'
import { attempt } from '../src/fail'

// -------------------------------------------------------------------
// The number guessing game example from
// https://www.youtube.com/watch?v=sxudIMiOo68

// -------------------------------------------------------------------
// Capabilities the game will need

type Print = { print(s: string): Resume<never, void> }
const print = (s: string) => op<Print>(c => c.print(s))

const println = (s: string) => print(`${s}\n`)

type Read = { read(): Resume<never, string> }
const read = op<Read>(c => c.read())

const ask = co(function* (prompt: string) {
  yield* print(prompt)
  return yield* read
})

type RandomInt = { randomInt(min: number, max: number): Resume<never, number> }
const randomInt = (min: number, max: number) => op<RandomInt>(c => c.randomInt(min, max))

// -------------------------------------------------------------------
// The game

// Min/max range for the number guessing game
type GameConfig = {
  timeLimit: number,
  min: number,
  max: number
}

// Core "business logic": evaluate the user's guess
const checkAnswer = (secret: number, guess: number): boolean =>
  secret === guess

// Play one round of the game.  Generate a number and ask the user
// to guess it.
const play = co(function* (name: string) {
  const { min, max, timeLimit } = yield* get<GameConfig>()
  const secret = yield* randomInt(min, max)
  const result =
    yield* attempt(timeout(timeLimit * 1000, ask(`Guess a number from ${min} to ${max} (you have ${timeLimit} seconds!): `)))

  if(typeof result === 'string') {
    const guess = Number(result)
    if (!guess || !Number.isInteger(guess)) {
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
const checkContinue = co(function* (name: string) {
  while(true) {
    const answer = yield* ask(`Do you want to continue, ${name}? (y or n) `)

    switch (answer.toLowerCase()) {
      case 'y': return true
      case 'n': return false
    }
  }
})

// Main game loop. Play round after round until the user chooses to quit
const main = co(function* () {
  const name = yield* ask('What is your name? ')
  yield* println(`Hello, ${name} welcome to the game!`)
  // yield* delay(1000)

  do {
    yield* play(name)
  } while(yield* checkContinue(name))

  yield* println(`Thanks for playing, ${name}.`)
})

// -------------------------------------------------------------------
// Implementations of all the capabilities the game needs.
// The type system will prevent running the game until implementations
// of all capabilities have been provided.
const capabilities = {
  min: 1,
  max: 5,
  timeLimit: 5,

  delay: (ms: number): Resume<never, void> =>
    resumeLater(k => {
      const t = setTimeout(k, ms)
      return () => clearTimeout(t)
    }),

  print: (s: string): Resume<never, void> =>
    resumeNow(void process.stdout.write(s)),

  read: (): Resume<never, string> =>
    resumeLater(k => {
      const readline = createInterface({ input: process.stdin })
        .once('line', s => {
          readline.close()
          k(s)
        })
      return () => readline.removeListener('line', k).close()
    }),

  randomInt: (min: number, max: number): Resume<never, number> =>
    resumeNow(Math.floor(min + (Math.random() * (max - min))))
}

unsafeRun(use(main(), capabilities))
