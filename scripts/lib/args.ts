import { createInterface } from 'node:readline'

export function parseFlags(argv: string[]): Map<string, string> {
  const flags = new Map<string, string>()
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--') && i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      flags.set(argv[i].slice(2), argv[i + 1])
      i++
    } else if (argv[i].startsWith('--')) {
      flags.set(argv[i].slice(2), 'true')
    }
  }
  return flags
}

export function getPositional(argv: string[]): string | undefined {
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      i++ // skip flag value
      continue
    }
    return argv[i]
  }
  return undefined
}

let rl: ReturnType<typeof createInterface> | null = null

function getRL() {
  if (!rl) {
    rl = createInterface({ input: process.stdin, output: process.stdout })
  }
  return rl
}

export function closeRL(): void {
  if (rl) {
    rl.close()
    rl = null
  }
}

export function prompt(question: string): Promise<string> {
  return new Promise(resolve => {
    getRL().question(question, answer => resolve(answer.trim()))
  })
}

export async function promptChoice(question: string, options: string[]): Promise<number[]> {
  for (let i = 0; i < options.length; i++) {
    console.log(`  [${i + 1}] ${options[i]}`)
  }
  const answer = await prompt(question)
  return answer
    .split(',')
    .map(s => parseInt(s.trim(), 10) - 1)
    .filter(n => n >= 0 && n < options.length)
}

export async function promptYesNo(question: string): Promise<boolean> {
  const answer = await prompt(`${question} (y/n): `)
  return answer.toLowerCase() === 'y'
}
