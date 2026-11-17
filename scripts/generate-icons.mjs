/**
 * Genera los íconos PWA para EcoCert 360 usando Sharp (ya instalado en el proyecto)
 */
import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dir, '../public/icons')
mkdirSync(outDir, { recursive: true })

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

// SVG del ícono EcoCert 360: fondo verde + hoja blanca
function iconSvg(size) {
  const r = Math.round(size * 0.22)   // border-radius
  const cx = size / 2
  const cy = size / 2
  const s  = size * 0.34              // escala de la hoja
  const sw = size * 0.045             // stroke width del tallo
  const fontSize = Math.round(size * 0.13)
  const showLabel = size >= 192

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Fondo verde redondeado -->
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#2F6B3F"/>

  <!-- Hoja (leaf) -->
  <path
    d="M${cx + s * 0.4} ${cy - s * 0.5}
       C${cx + s * 0.9} ${cy - s * 0.5} ${cx + s * 0.9} ${cy + s * 0.3} ${cx - s * 0.1} ${cy + s * 0.5}
       C${cx - s * 0.5} ${cy + s * 0.5} ${cx - s * 0.5} ${cy - s * 0.1} ${cx + s * 0.4} ${cy - s * 0.5}Z"
    fill="white"/>

  <!-- Tallo -->
  <path
    d="M${cx - s * 0.25} ${cy + s * 0.65} Q${cx + s * 0.1} ${cy + s * 0.1} ${cx + s * 0.4} ${cy - s * 0.5}"
    stroke="#DDEBDD" stroke-width="${sw}" stroke-linecap="round" fill="none"/>

  ${showLabel ? `<!-- Texto 360 -->
  <text x="${cx}" y="${size - size * 0.1}" text-anchor="middle"
    font-family="Inter, Arial, sans-serif" font-weight="600"
    font-size="${fontSize}" fill="white" opacity="0.9">360</text>` : ''}
</svg>`
}

// Generar PNGs de íconos
console.log('🎨 Generando íconos PWA...\n')
for (const size of sizes) {
  const svg = Buffer.from(iconSvg(size))
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(join(outDir, `icon-${size}x${size}.png`))
  console.log(`  ✓ icon-${size}x${size}.png`)
}

// Screenshot móvil (390x844) — fondo verde + texto
const mobileSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a3d26"/>
      <stop offset="100%" stop-color="#2F6B3F"/>
    </linearGradient>
  </defs>
  <rect width="390" height="844" fill="url(#g)"/>
  <!-- Ícono centrado -->
  <rect x="155" y="280" width="80" height="80" rx="18" ry="18" fill="#2F6B3F" stroke="white" stroke-width="2"/>
  <path d="M195 300 C210 300 215 315 203 325 C195 330 185 325 185 315 C185 305 190 300 195 300Z" fill="white"/>
  <path d="M188 332 Q194 325 195 300" stroke="#DDEBDD" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <!-- Título -->
  <text x="195" y="400" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="28" fill="white">EcoCert 360</text>
  <text x="195" y="435" text-anchor="middle" font-family="Arial, sans-serif" font-weight="400" font-size="14" fill="rgba(255,255,255,0.7)">Gestión Ambiental ISO 14001:2015</text>
  <!-- Pantalla de login simulada -->
  <rect x="30" y="480" width="330" height="260" rx="16" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
  <rect x="50" y="510" width="290" height="44" rx="8" fill="rgba(255,255,255,0.15)"/>
  <rect x="50" y="566" width="290" height="44" rx="8" fill="rgba(255,255,255,0.15)"/>
  <rect x="50" y="630" width="290" height="48" rx="8" fill="#2F6B3F" stroke="white" stroke-width="1.5"/>
  <text x="195" y="660" text-anchor="middle" font-family="Arial, sans-serif" font-weight="600" font-size="15" fill="white">Iniciar sesión</text>
</svg>`)

await sharp(mobileSvg).resize(390, 844).png().toFile(join(outDir, 'screenshot-mobile.png'))
console.log('  ✓ screenshot-mobile.png')

// Screenshot escritorio (1280x800)
const desktopSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a3d26"/>
      <stop offset="100%" stop-color="#2F6B3F"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="800" fill="url(#g)"/>
  <!-- Sidebar simulado -->
  <rect x="0" y="0" width="260" height="800" fill="rgba(0,0,0,0.3)"/>
  <text x="130" y="60" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="22" fill="white">EcoCert 360</text>
  <!-- Nav items -->
  <rect x="20" y="90" width="220" height="36" rx="8" fill="rgba(255,255,255,0.2)"/>
  <text x="40" y="113" font-family="Arial, sans-serif" font-size="14" fill="white">📊 Panel</text>
  <text x="40" y="153" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.6)">🌿 Aspectos</text>
  <text x="40" y="183" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.6)">⚖️ Requisitos</text>
  <text x="40" y="213" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.6)">🎯 Objetivos</text>
  <!-- Contenido principal -->
  <rect x="280" y="20" width="240" height="120" rx="12" fill="rgba(255,255,255,0.15)"/>
  <rect x="540" y="20" width="240" height="120" rx="12" fill="rgba(255,255,255,0.15)"/>
  <rect x="800" y="20" width="240" height="120" rx="12" fill="rgba(255,255,255,0.15)"/>
  <rect x="1060" y="20" width="200" height="120" rx="12" fill="rgba(255,255,255,0.15)"/>
  <text x="400" y="90" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="36" fill="white">8</text>
  <text x="400" y="115" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="rgba(255,255,255,0.7)">Aspectos</text>
  <text x="660" y="90" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="36" fill="white">12</text>
  <text x="660" y="115" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="rgba(255,255,255,0.7)">Objetivos</text>
  <!-- Título -->
  <text x="640" y="420" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="42" fill="white">EcoCert 360</text>
  <text x="640" y="465" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.7)">Plataforma de Gestión Ambiental ISO 14001:2015</text>
</svg>`)

await sharp(desktopSvg).resize(1280, 800).png().toFile(join(outDir, 'screenshot-desktop.png'))
console.log('  ✓ screenshot-desktop.png')

console.log('\n✅ Todos los íconos PWA generados en public/icons/')
