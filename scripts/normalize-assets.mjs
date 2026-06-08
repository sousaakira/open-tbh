/**
 * Copia sprites do pacote original para assets/sprites/ com nomes normalizados:
 *   characters/{id}/idle.png, walk.png, attack.png, ...
 *   tools/arrow-32.png
 *
 * IDs em kebab-case, sem espaços nem parênteses.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../assets')
const SRC_CHARS = path.join(ROOT, 'characters')
const OUT = path.join(ROOT, 'sprites')

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-')
}

/** [anim normalizado, candidatos no pacote original] */
const ANIM_CANDIDATES = (displayName) => [
  ['idle', [`${displayName}-Idle.png`]],
  ['walk', [`${displayName}-Walk.png`]],
  ['attack', [`${displayName}-Attack01.png`, `${displayName}-Attack.png`]],
  ['attack02', [`${displayName}-Attack02.png`]],
  ['attack03', [`${displayName}-Attack03.png`]],
  ['hurt', [`${displayName}-Hurt.png`]],
  ['death', [`${displayName}-Death.png`]],
  ['heal', [`${displayName}-Heal.png`]],
  ['block', [`${displayName}-Block.png`]],
]

function copyIfExists(src, dest) {
  if (!fs.existsSync(src)) return false
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
  return true
}

function normalizeCharacters() {
  let count = 0

  for (const displayName of fs.readdirSync(SRC_CHARS)) {
    const charRoot = path.join(SRC_CHARS, displayName)
    if (!fs.statSync(charRoot).isDirectory()) continue

    const srcDir = path.join(charRoot, displayName)
    if (!fs.existsSync(srcDir)) {
      console.warn(`[skip] pasta base ausente: ${displayName}/${displayName}`)
      continue
    }

    const id = slugify(displayName)
    const outDir = path.join(OUT, 'characters', id)

    for (const [anim, candidates] of ANIM_CANDIDATES(displayName)) {
      const found = candidates.find((file) => fs.existsSync(path.join(srcDir, file)))
      if (!found) continue

      const dest = path.join(outDir, `${anim}.png`)
      copyIfExists(path.join(srcDir, found), dest)
      count += 1
      console.log(`  ${id}/${anim}.png`)
    }
  }

  return count
}

function normalizeTools() {
  const toolsOut = path.join(OUT, 'tools')
  const mappings = [
    [path.join(ROOT, 'tools/Arrow(Projectile)/Arrow01(32x32).png'), path.join(toolsOut, 'arrow-32.png')],
    [path.join(ROOT, 'tools/Arrow(Projectile)/Arrow01(100x100).png'), path.join(toolsOut, 'arrow-100.png')],
  ]

  let count = 0
  for (const [src, dest] of mappings) {
    if (copyIfExists(src, dest)) {
      count += 1
      console.log(`  tools/${path.basename(dest)}`)
    }
  }
  return count
}

console.log('Normalizando assets...')
const charCount = normalizeCharacters()
const toolCount = normalizeTools()
console.log(`Pronto: ${charCount} sprites de personagem, ${toolCount} ferramentas → assets/sprites/`)
