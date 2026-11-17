/**
 * Genera íconos PWA para EcoCert 360 usando Sharp con SVG simple
 */
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dir, '../public/icons')
mkdirSync(outDir, { recursive: true })

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

// SVG minimalista: círculo verde + hoja blanca
function makeSvg(size) {
  const r = Math.round(size * 0.18) // radio del borde
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#2F6B3F"/>
  <circle cx="${size*0.5}" cy="${size*0.42}" r="${size*0.28}" fill="#DDEBDD" opacity="0.25"/>
  <path d="M${size*0.65} ${size*0.25} C${size*0.85} ${size*0.25} ${size*0.85} ${size*0.6} ${size*0.42} ${size*0.72} C${size*0.2} ${size*0.72} ${size*0.2} ${size*0.45} ${size*0.65} ${size*0.25}Z" fill="white"/>
  <path d="M${size*0.38} ${size*0.78} Q${size*0.5} ${size*0.55} ${size*0.65} ${size*0.25}" stroke="#DDEBDD" stroke-width="${size*0.04}" stroke-linecap="round" fill="none"/>
</svg>`
}

console.log('🎨  Generando íconos PWA...\n')

for (const size of sizes) {
  const svgBuf = Buffer.from(makeSvg(size), 'utf8')
  await sharp(svgBuf, { density: 300 })
    .resize(size, size)
    .png({ compressionLevel: 6, adaptiveFiltering: false })
    .toFile(join(outDir, `icon-${size}x${size}.png`))
  console.log(`  ✓ icon-${size}x${size}.png`)
}

// Screenshot móvil
const mobileSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a3d26"/><stop offset="100%" stop-color="#2F6B3F"/></linearGradient></defs>
  <rect width="390" height="844" fill="url(#g)"/>
  <rect x="145" y="260" width="100" height="100" rx="22" fill="#2F6B3F" stroke="white" stroke-width="2.5"/>
  <path d="M195 278 C215 278 222 300 208 312 C198 320 182 314 182 302 C182 290 190 278 195 278Z" fill="white"/>
  <path d="M186 324 Q196 310 195 278" stroke="#DDEBDD" stroke-width="3" stroke-linecap="round" fill="none"/>
  <text x="195" y="410" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="30" fill="white">EcoCert 360</text>
  <text x="195" y="445" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="rgba(255,255,255,0.7)">Gestión Ambiental ISO 14001</text>
  <rect x="40" y="490" width="310" height="240" rx="16" fill="rgba(255,255,255,0.1)"/>
  <rect x="60" y="520" width="270" height="40" rx="8" fill="rgba(255,255,255,0.15)"/>
  <rect x="60" y="572" width="270" height="40" rx="8" fill="rgba(255,255,255,0.15)"/>
  <rect x="60" y="634" width="270" height="44" rx="8" fill="#245431"/>
  <text x="195" y="662" text-anchor="middle" font-family="Arial,sans-serif" font-weight="600" font-size="15" fill="white">Iniciar sesión</text>
</svg>`

await sharp(Buffer.from(mobileSvg, 'utf8'), { density: 150 })
  .resize(390, 844)
  .png({ compressionLevel: 6 })
  .toFile(join(outDir, 'screenshot-mobile.png'))
console.log('  ✓ screenshot-mobile.png')

// Screenshot escritorio
const desktopSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1a3d26"/><stop offset="100%" stop-color="#2F6B3F"/></linearGradient></defs>
  <rect width="1280" height="800" fill="url(#g)"/>
  <rect x="0" y="0" width="260" height="800" fill="rgba(0,0,0,0.3)"/>
  <text x="130" y="55" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="20" fill="white">EcoCert 360</text>
  <rect x="15" y="75" width="230" height="34" rx="8" fill="rgba(255,255,255,0.2)"/>
  <text x="35" y="97" font-family="Arial,sans-serif" font-size="13" fill="white">Panel</text>
  <text x="35" y="135" font-family="Arial,sans-serif" font-size="13" fill="rgba(255,255,255,0.6)">Aspectos e impactos</text>
  <text x="35" y="165" font-family="Arial,sans-serif" font-size="13" fill="rgba(255,255,255,0.6)">Requisitos legales</text>
  <text x="35" y="195" font-family="Arial,sans-serif" font-size="13" fill="rgba(255,255,255,0.6)">Objetivos</text>
  <text x="35" y="225" font-family="Arial,sans-serif" font-size="13" fill="rgba(255,255,255,0.6)">Auditorías</text>
  <rect x="280" y="20" width="230" height="110" rx="12" fill="rgba(255,255,255,0.15)"/>
  <text x="395" y="80" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="38" fill="white">8</text>
  <text x="395" y="108" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="rgba(255,255,255,0.7)">Aspectos</text>
  <rect x="530" y="20" width="230" height="110" rx="12" fill="rgba(255,255,255,0.15)"/>
  <text x="645" y="80" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="38" fill="white">5</text>
  <text x="645" y="108" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="rgba(255,255,255,0.7)">Objetivos</text>
  <rect x="780" y="20" width="230" height="110" rx="12" fill="rgba(255,255,255,0.15)"/>
  <text x="895" y="80" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="38" fill="white">4</text>
  <text x="895" y="108" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="rgba(255,255,255,0.7)">No conformidades</text>
  <text x="770" y="430" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="40" fill="white">EcoCert 360</text>
  <text x="770" y="470" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" fill="rgba(255,255,255,0.7)">Gestión Ambiental ISO 14001:2015</text>
</svg>`

await sharp(Buffer.from(desktopSvg, 'utf8'), { density: 150 })
  .resize(1280, 800)
  .png({ compressionLevel: 6 })
  .toFile(join(outDir, 'screenshot-desktop.png'))
console.log('  ✓ screenshot-desktop.png')

console.log('\n✅  Íconos regenerados correctamente en public/icons/')
