import { op, co, get, unsafeRunEffects, Resume, resumeNow, resumeLater, Env, Computation, use, Use } from '../src'
import { createInterface } from 'readline'

// -------------------------------------------------------------------
// The number guessing game example from
// https://www.youtube.com/watch?v=sxudIMiOo68

// -------------------------------------------------------------------
// Capabilities the game will need

interface Print {
  print (s: string): Resume<void>
}

const print = (s: string) => op<Print, void>(c => c.print(s))

const println = (s: string) => print(`${s}\n`)

interface Read {
  read (): Resume<string>
}

const read = op<Read, string>(c => c.read())

const ask = co(function* (prompt: string) {
  yield* print(prompt)
  return yield* read
})

interface Random {
  randomInt (min: number, max: number): Resume<number>
}

const randomInt = (min: number, max: number) => op<Random, number>(c => c.randomInt(min, max))

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
const play = co(function* (name: string, min: number, max: number) {
  const secret = yield* randomInt(min, max)
  const guess = Number(yield* ask(`Dear ${name}, please guess a number from ${min} to ${max}: `))

  if(!Number.isInteger(guess)) {
    yield* println('You did not enter an integer!')
  } else {
    if(checkAnswer(secret, guess)) yield* println(`You guessed right, ${name}!`)
    else yield* println(`You guessed wrong, ${name}! The number was: ${secret}`)
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

  const { min, max } = yield* get<GameConfig>()

  do {
    yield* play(name, min, max)
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

  print: (s: string): Resume<void> =>
    resumeNow(void process.stdout.write(s)),

  read: (): Resume<string> =>
    resumeLater(k => {
      const readline = createInterface({
        input: process.stdin
      })      
      readline.once('line', s => {
        readline.close()
        k(s)
      })
      return () =>
        readline.removeListener('line', k).close()
    }),

  randomInt: (min: number, max: number): Resume<number> =>
    resumeNow(Math.floor(min + (Math.random() * (max - min))))
}

unsafeRunEffects(use(main(), capabilities))



