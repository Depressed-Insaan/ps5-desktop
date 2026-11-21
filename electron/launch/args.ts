/**
 * Argument handling for the launch core.
 *
 * Free text is split into an argv array exactly once, when it is edited. Every
 * launch reuses the stored array, so a value can never be re-split or
 * re-interpreted by a shell at start time.
 */

/** Splits an argument string, honouring quotes and backslash-escaped quotes. */
export function parseArgs(raw: string): string[] {
  const parts: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  let started = false

  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index]

    if (quote === '"' && character === '\\' && raw[index + 1] === '"') {
      current += '"'
      index += 1
      started = true
      continue
    }

    if (quote) {
      if (character === quote) {
        quote = null
      } else {
        current += character
      }
      continue
    }

    if (character === '"' || character === "'") {
      quote = character
      started = true
      continue
    }

    if (/\s/.test(character)) {
      if (started) {
        parts.push(current)
        current = ''
        started = false
      }
      continue
    }

    current += character
    started = true
  }

  if (started) parts.push(current)
  return parts.filter((part) => part.length > 0)
}

/** Inverse of `parseArgs`, so the editor can show an editable string. */
export function formatArgs(args: string[]): string {
  return args
    .map((arg) =>
      arg === '' || /[\s"']/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg,
    )
    .join(' ')
}

const UNSAFE_FOR_CMD = /[\r\n"^%!&|<>]/

/**
 * Escapes one argument for `cmd.exe`. Returns null when the value cannot be
 * represented safely, in which case the caller must refuse to launch rather
 * than guess: `cmd` re-parses its whole command line, so anything it treats as
 * syntax would be a second command.
 */
export function safeShellArg(arg: string): string | null {
  if (!arg || arg.length > 1024) return null
  if (UNSAFE_FOR_CMD.test(arg)) return null
  return /\s/.test(arg) ? `"${arg}"` : arg
}

/** Electron's own variables must never leak into a game process. */
const INTERNAL_ENV = /^ELECTRON_/i
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/

/**
 * Builds the environment for a game: a copy of ours with Electron internals
 * removed, plus the per-game extras that were validated when they were saved.
 */
export function childEnvironment(extra: Record<string, string>): NodeJS.ProcessEnv {
  const environment: Record<string, string> = {}

  for (const [name, value] of Object.entries(process.env)) {
    if (value === undefined || INTERNAL_ENV.test(name)) continue
    environment[name] = value
  }

  for (const [name, value] of Object.entries(extra)) {
    if (!ENV_NAME.test(name) || value.length > 4096) continue
    environment[name] = value
  }

  // `spawn` wants a ProcessEnv, which this project's typings have narrowed to
  // require its own two variables; a plain map is the correct value here.
  return environment as NodeJS.ProcessEnv
}
