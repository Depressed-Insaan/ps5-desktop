import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { LaunchConfig, WatchMode } from '../../src/types'
import { safeShellArg } from './args'
import { requiresTrust } from './config'
import { isDirectory, isFile, withinRoot } from './paths'

/**
 * The runtime registry.
 *
 * No language or engine gets its own launch implementation. An adapter supplies
 * knowledge only: how to find an entry point (`detect`) and what command a
 * stored configuration becomes (`plan`). Spawning, tracking and playtime stay
 * in one place, so adding a runtime later is additive.
 */

export interface Detection {
  runtime: string
  label: string
  /** 0..100 confidence; higher wins when a folder offers several entries. */
  score: number
  entry: string
  cwd: string
  watch: WatchMode
  requiresTrust: boolean
  notes: string[]
}

export type LaunchPlan =
  | {
      kind: 'spawn'
      command: string
      args: string[]
      cwd: string
      env: Record<string, string>
      watch: WatchMode
      warning?: string
    }
  | { kind: 'open'; mode: 'path' | 'url'; target: string; watch: 'manual' }
  | { kind: 'window'; root: string; entry: string; watch: 'window' }
  | { kind: 'failure'; error: string }

export interface RuntimeAdapter {
  id: string
  label: string
  detect(target: string): Detection[]
  plan(config: LaunchConfig): LaunchPlan
}

export interface LaunchDescription {
  runtime: string
  label: string
  command: string
  watch: WatchMode
  ready: boolean
  warning: string | null
  requiresTrust: boolean
}

/** Files shipped next to a game that are never the game itself. */
const HELPER_PATTERNS = [
  /^unins/i,
  /^vcredist/i,
  /^dxsetup/i,
  /^dxwebsetup/i,
  /^unitycrashhandler/i,
  /^ue4prereqsetup/i,
  /^ueprereqsetup/i,
  /^setup$/i,
  /^installer/i,
  /^crashreport/i,
]

function readNames(directory: string): string[] {
  try {
    return readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
  } catch {
    return []
  }
}

function detectFile(entry: string): Detection | null {
  const extension = path.extname(entry).toLowerCase()
  const cwd = path.dirname(entry)
  const base = { runtime: 'native', entry, cwd, watch: 'process' as WatchMode }

  switch (extension) {
    case '.exe':
      return { ...base, label: 'Windows program', score: 100, requiresTrust: false, notes: [] }
    case '.bat':
    case '.cmd':
      return {
        ...base,
        label: 'Batch script',
        score: 85,
        requiresTrust: true,
        notes: ['Runs through the Windows command processor.'],
      }
    case '.ps1':
      return {
        ...base,
        label: 'PowerShell script',
        score: 85,
        requiresTrust: true,
        notes: ['Runs with the execution policy bypassed for this window.'],
      }
    case '.lnk':
      return {
        ...base,
        label: 'Shortcut',
        score: 80,
        watch: 'manual',
        requiresTrust: true,
        notes: ['Windows decides the real target, so playtime is tracked until you stop it.'],
      }
    case '.url':
      return {
        ...base,
        label: 'Web shortcut',
        score: 70,
        watch: 'manual',
        requiresTrust: true,
        notes: [],
      }
    default:
      return null
  }
}

function detectDirectory(root: string): Detection[] {
  const found: Detection[] = []
  const folder = path.basename(root).toLowerCase()

  // Packaged Unreal builds put a bootstrap executable at the top level and the
  // real game under Binaries/Win64.
  for (const name of readNames(path.join(root, 'Binaries', 'Win64'))) {
    if (!/-Shipping\.exe$/i.test(name)) continue
    found.push({
      runtime: 'native',
      label: 'Unreal build',
      score: 105,
      entry: path.join(root, 'Binaries', 'Win64', name),
      cwd: root,
      watch: 'tree',
      requiresTrust: false,
      notes: ['Starts the packaged game directly, skipping the launcher.'],
    })
  }

  for (const name of readNames(root)) {
    if (!/\.exe$/i.test(name)) continue

    const entry = path.join(root, name)
    if (!isFile(entry)) continue
    if (found.some((detection) => detection.entry.toLowerCase() === entry.toLowerCase())) continue

    const base = path.basename(name, path.extname(name)).toLowerCase()
    const helper = HELPER_PATTERNS.some((pattern) => pattern.test(base))

    let score = 60
    if (base === folder) score = 95
    else if (folder && folder.includes(base)) score = 88
    else if (folder && base.includes(folder)) score = 84
    if (helper) score -= 55

    found.push({
      runtime: 'native',
      label: helper ? 'Installer or helper' : 'Windows program',
      score,
      entry,
      cwd: root,
      watch: 'process',
      requiresTrust: false,
      notes: helper ? ['Looks like a helper rather than the game itself.'] : [],
    })
  }

  return found
}

function detectNative(target: string): Detection[] {
  if (isFile(target)) {
    const single = detectFile(target)
    return single ? [single] : []
  }
  if (isDirectory(target)) return detectDirectory(target)
  return []
}

/** Reads the address out of an Internet Shortcut, accepting only the web. */
function readInternetShortcut(entry: string): string | null {
  try {
    const contents = readFileSync(entry, 'utf8')
    const match = /^\s*URL\s*=\s*(.+)$/im.exec(contents)
    const target = match?.[1]?.trim()
    if (!target || !/^https?:\/\//i.test(target)) return null
    return target
  } catch {
    return null
  }
}

function planNative(config: LaunchConfig): LaunchPlan {
  if (!config.entry) return { kind: 'failure', error: 'This game has no launch target yet.' }
  if (!existsSync(config.entry)) {
    return { kind: 'failure', error: 'That file is no longer where it was.' }
  }

  const root = config.root || path.dirname(config.entry)
  if (!withinRoot(root, config.entry)) {
    return { kind: 'failure', error: 'The launch target is outside the game folder.' }
  }

  const cwd = config.cwd || root
  if (!isDirectory(cwd)) {
    return { kind: 'failure', error: 'That working folder is no longer on this PC.' }
  }

  const args = config.args
  if (args.some((arg) => arg.includes('\u0000'))) {
    return { kind: 'failure', error: 'Those arguments cannot be passed to a program.' }
  }

  const extension = path.extname(config.entry).toLowerCase()
  const watch: WatchMode = config.watch === 'window' ? 'process' : config.watch

  switch (extension) {
    case '.exe':
      return { kind: 'spawn', command: config.entry, args, cwd, env: config.env, watch }

    case '.bat':
    case '.cmd': {
      /*
       * cmd re-parses its whole command line, so each argument is checked
       * against what cmd would treat as syntax. Refusing is better than
       * quietly starting a second command.
       */
      const escaped: string[] = []
      for (const arg of args) {
        const safe = safeShellArg(arg)
        if (safe === null) {
          return {
            kind: 'failure',
            error:
              'Batch files cannot take arguments containing quotes, percent signs or shell characters.',
          }
        }
        escaped.push(safe)
      }

      return {
        kind: 'spawn',
        command: process.env.ComSpec ?? 'cmd.exe',
        args: ['/d', '/s', '/c', 'call', config.entry, ...escaped],
        cwd,
        env: config.env,
        watch,
      }
    }

    case '.ps1':
      return {
        kind: 'spawn',
        command: 'powershell.exe',
        args: [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          config.entry,
          ...args,
        ],
        cwd,
        env: config.env,
        watch,
        warning: 'Runs with the PowerShell execution policy bypassed.',
      }

    case '.lnk':
      return { kind: 'open', mode: 'path', target: config.entry, watch: 'manual' }

    case '.url': {
      const target = readInternetShortcut(config.entry)
      if (!target) {
        return { kind: 'failure', error: 'That shortcut has no web address Ani Games can open.' }
      }
      return { kind: 'open', mode: 'url', target, watch: 'manual' }
    }

    default:
      return {
        kind: 'failure',
        error: `Ani Games cannot start ${extension || 'that kind of file'} yet.`,
      }
  }
}

function detectHtml(target: string): Detection[] {
  if (isFile(target) && /\.html?$/i.test(target)) {
    return [
      {
        runtime: 'html',
        label: 'HTML game',
        score: 96,
        entry: target,
        cwd: path.dirname(target),
        watch: 'window',
        requiresTrust: false,
        notes: ['Runs in its own isolated window.'],
      },
    ]
  }

  if (!isDirectory(target)) return []

  for (const name of ['index.html', 'index.htm']) {
    const entry = path.join(target, name)
    if (!isFile(entry)) continue

    const notes = ['Runs in its own isolated window.']
    if (existsSync(path.join(target, 'project.godot')) || existsSync(path.join(target, 'index.pck'))) {
      notes.push('Looks like a Godot web export.')
    }
    if (existsSync(path.join(target, 'Build'))) notes.push('Looks like a Unity WebGL build.')

    return [
      {
        runtime: 'html',
        label: 'HTML game',
        score: 94,
        entry,
        cwd: target,
        watch: 'window',
        requiresTrust: false,
        notes,
      },
    ]
  }

  return []
}

function planHtml(config: LaunchConfig): LaunchPlan {
  if (!config.entry) return { kind: 'failure', error: 'This game has no entry point yet.' }
  if (!isFile(config.entry)) {
    return { kind: 'failure', error: 'That page is no longer where it was.' }
  }

  const root = config.root || path.dirname(config.entry)
  if (!withinRoot(root, config.entry)) {
    return { kind: 'failure', error: 'The entry point is outside the game folder.' }
  }

  return { kind: 'window', root, entry: config.entry, watch: 'window' }
}

export const nativeAdapter: RuntimeAdapter = {
  id: 'native',
  label: 'Windows program',
  detect: detectNative,
  plan: planNative,
}

export const htmlAdapter: RuntimeAdapter = {
  id: 'html',
  label: 'HTML game',
  detect: detectHtml,
  plan: planHtml,
}

const ADAPTERS: RuntimeAdapter[] = [nativeAdapter, htmlAdapter]

export function adapterFor(id: string): RuntimeAdapter | undefined {
  return ADAPTERS.find((adapter) => adapter.id === id)
}

export function runtimeExists(id: string): boolean {
  return ADAPTERS.some((adapter) => adapter.id === id)
}

/** Every adapter ranks what it can start, best first, without duplicates. */
export function detectAll(target: string): Detection[] {
  const seen = new Set<string>()
  const detections: Detection[] = []

  for (const adapter of ADAPTERS) {
    for (const detection of adapter.detect(target)) {
      const key = detection.entry.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      detections.push(detection)
    }
  }

  return detections.sort((left, right) => right.score - left.score)
}

export function planFor(config: LaunchConfig): LaunchPlan {
  const adapter = adapterFor(config.runtime) ?? nativeAdapter
  return adapter.plan(config)
}

function quoted(command: string): string {
  return /[\s]/.test(command) ? `"${command}"` : command
}

function labelFor(config: LaunchConfig, plan: LaunchPlan): string {
  if (plan.kind === 'window') return 'HTML game'

  const extension = path.extname(config.entry).toLowerCase()
  switch (extension) {
    case '.bat':
    case '.cmd':
      return 'Batch script'
    case '.ps1':
      return 'PowerShell script'
    case '.lnk':
      return 'Shortcut'
    case '.url':
      return 'Web shortcut'
    default:
      return 'Windows program'
  }
}

function commandFor(plan: LaunchPlan, gameId?: string): string {
  if (plan.kind === 'spawn') {
    return [plan.command, ...plan.args].map(quoted).join(' ')
  }
  if (plan.kind === 'open') return `Open ${plan.target}`
  if (plan.kind === 'window') {
    const relative = path
      .relative(plan.root, plan.entry)
      .split(path.sep)
      .map(encodeURIComponent)
      .join('/')
    return `ani-game://${gameId ?? 'game'}/${relative}`
  }
  return ''
}

/** Everything the interface needs to describe how a game will start. */
export function describeLaunch(config: LaunchConfig, gameId?: string): LaunchDescription {
  const trust = requiresTrust(config)

  if (!config.entry) {
    return {
      runtime: config.runtime,
      label: 'Not set up',
      command: '',
      watch: config.watch,
      ready: false,
      warning: null,
      requiresTrust: trust,
    }
  }

  const adapter = adapterFor(config.runtime) ?? nativeAdapter
  const plan = adapter.plan(config)

  if (plan.kind === 'failure') {
    return {
      runtime: adapter.id,
      label: labelFor(config, plan),
      command: '',
      watch: config.watch,
      ready: false,
      warning: plan.error,
      requiresTrust: trust,
    }
  }

  return {
    runtime: adapter.id,
    label: labelFor(config, plan),
    command: commandFor(plan, gameId),
    watch: plan.watch,
    ready: true,
    warning: plan.kind === 'spawn' ? (plan.warning ?? null) : null,
    requiresTrust: trust,
  }
}
