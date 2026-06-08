#!/usr/bin/env node
/**
 * Build de release: Vite + electron-builder para Windows, Linux e macOS.
 *
 * Uso:
 *   npm run build:release              # plataforma do host (win/linux/mac)
 *   npm run build:all                  # tenta win + linux + mac
 *   npm run build:win
 *   npm run build:linux
 *   npm run build:mac
 *   node scripts/build-release.mjs --win --linux
 *
 * Notas:
 * - Pacotes nativos de cada SO em geral exigem build no próprio SO (ou CI).
 * - macOS (.dmg) só compila em macOS sem configuração extra.
 * - Windows no Linux: gera portable + zip (NSIS exige Wine; use Windows para o instalador).
 * - Artefatos finais ficam em release/
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const IS_WIN = process.platform === 'win32'

const PLATFORMS = ['win', 'linux', 'mac']

function bin(name) {
  const base = path.join(ROOT, 'node_modules', '.bin', name)
  return IS_WIN ? `${base}.cmd` : base
}

function buildEnv() {
  const env = { ...process.env }
  // Evita signtool/Wine ao cross-compilar Windows fora do Windows
  if (process.platform !== 'win32') {
    env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
  }
  return env
}

function run(cmd, args, label, env = buildEnv()) {
  console.log(`\n==> ${label}`)
  console.log(`    ${cmd} ${args.join(' ')}`)

  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env,
  })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function defaultPlatform() {
  if (process.platform === 'win32') return 'win'
  if (process.platform === 'darwin') return 'mac'
  return 'linux'
}

function parsePlatforms(argv) {
  if (argv.includes('--all')) return [...PLATFORMS]

  const selected = PLATFORMS.filter((platform) => argv.includes(`--${platform}`))
  if (selected.length > 0) return selected

  return [defaultPlatform()]
}

function warnCrossCompile(platforms) {
  const host = process.platform

  if (platforms.includes('mac') && host !== 'darwin') {
    console.warn(
      '\n[aviso] Build macOS em host não-mac costuma falhar. Use um Mac ou CI com runner macOS.\n',
    )
  }

  if (platforms.includes('win') && host !== 'win32') {
    console.warn(
      '\n[info] Windows neste host: portable + zip (sem instalador NSIS).\n' +
        '       Para "IDLL Game Setup.exe", rode npm run build:win no Windows.\n',
    )
  }
}

function viteBuild() {
  if (IS_WIN) {
    run(bin('tsc'), [], 'TypeScript')
    run(bin('vite'), ['build'], 'Vite')
    return
  }

  run('npm', ['run', 'build'], 'Vite + TypeScript (npm run build)')
}

function electronBuild(platforms) {
  const builder = bin('electron-builder')
  if (!fs.existsSync(builder)) {
    console.error('electron-builder não encontrado. Rode: npm install')
    process.exit(1)
  }

  for (const platform of platforms) {
    if (platform === 'mac' && process.platform !== 'darwin') {
      console.warn('\n[skip] macOS ignorado — requer host macOS ou CI macOS.\n')
      continue
    }

    const args = ['--publish', 'never']

    if (platform === 'win') {
      if (forceNsis) {
        if (process.platform !== 'win32') {
          console.error('\n[erro] Instalador NSIS só pode ser gerado no Windows.\n')
          process.exit(1)
        }
        args.push('--win', 'nsis')
      } else if (process.platform !== 'win32') {
        // NSIS chama Wine no Linux e costuma falhar; portable/zip funcionam sem instalador
        args.push('--win', 'portable', 'zip')
        run(builder, args, 'electron-builder (win: portable + zip)')
        continue
      } else {
        args.push('--win')
      }
      run(builder, args, `electron-builder (${platform}${forceNsis ? ': nsis' : ''})`)
      continue
    }

    args.push(`--${platform}`)
    run(builder, args, `electron-builder (${platform})`)
  }
}

const argv = process.argv.slice(2)
const platforms = parsePlatforms(argv)
const forceNsis = argv.includes('--nsis')

console.log('IDLL Game — build de release')
console.log(`Host: ${process.platform}`)
console.log(`Plataformas: ${platforms.join(', ')}`)

warnCrossCompile(platforms)

viteBuild()
electronBuild(platforms)

console.log('\n✓ Build concluído. Confira a pasta release/')
