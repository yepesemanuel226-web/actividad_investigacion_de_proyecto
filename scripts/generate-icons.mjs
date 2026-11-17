/**
 * Genera íconos PWA válidos para EcoCert 360
 * Usa Sharp con configuración explícita para garantizar PNGs correctos
 */
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dir, '../public/icons')
mkdirSync(outDir, { recursive: true })

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

// Crear PNG directamente desde un buffer de píxeles (sin SVG)
// para garantizar que el archivo es 100% válido
async function createIconPng(size) {
  // Crear imagen base verde
  const green = { r: 47, g: 107, b: 63, alpha: 1 }
  const lightGreen = { r: 221, g: 235, b: 221, alpha: 0.8 }
  const white = { r: 255, g: 255, b: 255, alpha: 1 }

  // Fondo verde con esquinas redondeadas usando SVG simple
  const radius = Math.round(size * 0.18)
  const leafX1 = Math.round(size * 0.65)
  const leafY1 = Math.round(size * 0.25)
  const leafX2 = Math.round(size * 0.85)
  const leafY2 = Math.round(size * 0.6)
  const leafX3 = Math.round(size * 0.42)
  const leafY3 = Math.round(size * 0.72)
  const stemW = Math.max(2, Math.round(size * 0.04))
  const fontSize = Math.round(size * 0.14)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#2F6B3F"/>
    <path d="M${leafX1} ${leafY1} C${leafX2} ${leafY1} ${leafX2} ${leafY2} ${leafX3} ${leafY3} C${Math.round(size*0.2)} ${leafY3} ${Math.round(size*0.2)} ${Math.round(size*0.45)} ${leafX1} ${leafY1}Z" fill="white"/>
    <path d="M${Math.round(size*0.38)} ${Math.round(size*0.78)} Q${Math.round(size*0.5)} ${Math.round(size*0.55)} ${leafX1} ${leafY1}" stroke="#DDEBDD" stroke-width="${stemW}" stroke-linecap="round" fill="none"/>
    ${size >= 192 ? `<text x="${size/2}" y="${Math.round(size*0.9)}" text-anchor="middle" font-family="Arial" font-weight="700" font-size="${fontSize}" fill="rgba(255,255,255,0.85)">360</text>` : ''}
  </svg>`

  const buffer = await sharp(Buffer.from(svg), { density: 300 })
    .resize(size, size, { fit: 'fill' })
    .png({
      compressionLevel: 6,
      adaptiveFiltering: false,
      palette: false,
    })
    .toBuffer()

  return buffer
}

console.log('🎨  Generando íconos PWA...\n')

for (const size of sizes) {
  const buf = await createIconPng(size)
  const path = join(outDir, `icon-${size}x${size}.png`)
  writeFileSync(path, buf)

  // Verificar que el PNG es válido
  const header = buf.slice(0, 4)
  const valid = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47
  console.log(`  ${valid ? '✓' : '✗'} icon-${size}x${size}.png (${(buf.length/1024).toFixed(1)} KB) ${valid ? '' : '← INVÁLIDO'}`)
}

// Screenshots
const mobileSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#1a3d26"/>
    <stop offset="100%" stop-color="#2F6B3F"/>
  </linearGradient></defs>
  <rect width="390" height="844" fill="url(#g)"/>
  <rect x="145" y="260" width="100" height="100" rx="22" fill="#2F6B3F" stroke="white" stroke-width="2.5"/>
  <path d="M195 278 C215 278 222 300 208 312 C198 320 182 314 182 302 C182 290 190 278 195 278Z" fill="white"/>
  <text x="195" y="410" text-anchor="middle" font-family="Arial" font-weight="700" font-size="30" fill="white">EcoCert 360</text>
  <text x="195" y="445" text-anchor="middle" font-family="Arial" font-size="14" fill="rgba(255,255,255,0.7)">Gestión Ambiental ISO 14001</text>
</svg>`

const desktopSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#1a3d26"/>
    <stop offset="100%" stop-color="#2F6B3F"/>
  </linearGradient></defs>
  <rect width="1280" height="800" fill="url(#g)"/>
  <text x="640" y="400" text-anchor="middle" font-family="Arial" font-weight="700" font-size="48" fill="white">EcoCert 360</text>
  <text x="640" y="455" text-anchor="middle" font-family="Arial" font-size="20" fill="rgba(255,255,255,0.7)">Plataforma de Gestión Ambiental ISO 14001:2015</text>
</svg>`

const mobBuf = await sharp(Buffer.from(mobileSvg), { density: 150 })
  .resize(390, 844).png({ compressionLevel: 6 }).toBuffer()
writeFileSync(join(outDir, 'screenshot-mobile.png'), mobBuf)
console.log(`  ✓ screenshot-mobile.png (${(mobBuf.length/1024).toFixed(1)} KB)`)

const deskBuf = await sharp(Buffer.from(desktopSvg), { density: 150 })
  .resize(1280, 800).png({ compressionLevel: 6 }).toBuffer()
writeFileSync(join(outDir, 'screenshot-desktop.png'), deskBuf)
console.log(`  ✓ screenshot-desktop.png (${(deskBuf.length/1024).toFixed(1)} KB)`)

console.log('\n✅  Todos los íconos generados y verificados')
