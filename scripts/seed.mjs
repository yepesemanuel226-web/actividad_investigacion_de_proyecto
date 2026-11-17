/**
 * EcoCert 360 — Script de seed de datos de ejemplo
 *
 * Uso (con el servidor DETENIDO):
 *   node scripts/seed.mjs
 *
 * Crea en org1 (EcoVerde S.A.S.):
 *   • 2 organizaciones (org1 activa, org2 vacía para prueba de aislamiento)
 *   • 5 aspectos (1 Pendiente, 2 Alta, 1 Media, 1 Baja)
 *   • 4 requisitos legales (1 por vencer en 10 días)
 *   • 2 auditorías (1 Programada, 1 En ejecución)
 *   • 3 no conformidades (distintos estados)
 *   • 2 incidentes
 */

import { readFileSync } from 'fs'
import pg from 'pg'

const { Client } = pg

// Leer .env manualmente (sin dotenv para evitar dependencias)
try {
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  for (const line of env.split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && v.length) process.env[k.trim()] = v.join('=').trim()
  }
} catch {}

const DB_URL = process.env.DATABASE_URL
if (!DB_URL) {
  console.error('❌  DATABASE_URL no encontrado en .env')
  process.exit(1)
}

const client = new Client({ connectionString: DB_URL })
await client.connect()
console.log('✅  Conectado a PostgreSQL\n')

// ── Helpers ──────────────────────────────────────────────────────────────────

async function q(sql, params = []) {
  const res = await client.query(sql, params)
  return res.rows
}

async function ins(table, data) {
  const keys = Object.keys(data)
  const vals = Object.values(data)
  const cols = keys.map(k => `"${k}"`).join(', ')
  const ph   = keys.map((_, i) => `$${i + 1}`).join(', ')
  const rows = await q(
    `INSERT INTO "${table}" (${cols}) VALUES (${ph}) ON CONFLICT DO NOTHING RETURNING *`,
    vals,
  )
  return rows[0]
}

async function upsertNit(data) {
  const keys = Object.keys(data)
  const vals = Object.values(data)
  const cols = keys.map(k => `"${k}"`).join(', ')
  const ph   = keys.map((_, i) => `$${i + 1}`).join(', ')
  const upd  = keys.filter(k => k !== 'nit').map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')
  const rows = await q(
    `INSERT INTO "organizations" (${cols}) VALUES (${ph})
     ON CONFLICT ("nit") DO UPDATE SET ${upd} RETURNING *`,
    vals,
  )
  return rows[0]
}

const now = new Date().toISOString()
const addDays = (d) => { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString() }

// ── ORGANIZACIONES ────────────────────────────────────────────────────────────

console.log('📦  Organizaciones...')

const org1 = await upsertNit({ name: 'EcoVerde S.A.S.', nit: '900.123.456-7', sector: 'Manufactura', status: 'active', requested_at: now, approved_at: now, updated_at: now, created_at: now })
const org2 = await upsertNit({ name: 'AmbienTech Ltda.', nit: '800.987.654-3', sector: 'Tecnología',  status: 'active', requested_at: now, approved_at: now, updated_at: now, created_at: now })

console.log(`  ✓ ${org1.name}  (id ${org1.id})`)
console.log(`  ✓ ${org2.name}  (id ${org2.id})`)

// ── ASPECTOS ──────────────────────────────────────────────────────────────────

console.log('\n🌿  Aspectos e impactos...')

const aspectsRaw = [
  { activity: 'Operación de caldera',   name: 'Consumo de agua',                   impact: 'Agotamiento del recurso hídrico',       sev: 4, freq: 5, scope: 3 },
  { activity: 'Gestión de residuos',    name: 'Generación de residuos peligrosos', impact: 'Contaminación de suelo',               sev: 3, freq: 4, scope: 4 },
  { activity: 'Operación de caldera',   name: 'Emisiones atmosféricas',            impact: 'Deterioro de calidad del aire',         sev: 5, freq: 3, scope: 5 },
  { activity: 'Administración general', name: 'Consumo de papel',                  impact: 'Agotamiento de recursos forestales',    sev: 2, freq: 3, scope: 3 },
  { activity: 'Proceso de lavado',      name: 'Vertimiento de aguas residuales',   impact: 'Contaminación hídrica',                 sev: null, freq: null, scope: null },
]

const aspIds = []
for (const a of aspectsRaw) {
  const sig = a.sev != null ? a.sev * a.freq * a.scope : null
  const level = sig === null ? 'Pendiente' : sig >= 60 ? 'Alta' : sig >= 27 ? 'Media' : 'Baja'
  const row = await ins('aspects', {
    organization_id: org1.id,
    activity: a.activity,
    name: a.name,
    impact: a.impact,
    ...(a.sev != null ? { severity: a.sev, frequency: a.freq, scope: a.scope, significance: sig } : {}),
    level,
    updated_at: now,
    created_at: now,
  })
  aspIds.push(row?.id ?? null)
  console.log(`  ✓ ${a.name} → ${level}${sig ? ` (sig ${sig})` : ''}`)
}

// ── REQUISITOS LEGALES ────────────────────────────────────────────────────────

console.log('\n⚖️  Requisitos legales...')

const legalsRaw = [
  { title: 'Resolución 0631 de 2015', issuer: 'MinAmbiente', compliance: 'Cumple',      nextReview: addDays(60), aspIdx: 2 },
  { title: 'Decreto 1076 de 2015',    issuer: 'MinAmbiente', compliance: 'Sin evaluar', nextReview: addDays(10), aspIdx: 0 },
  { title: 'Resolución 2184 de 2019', issuer: 'MinAmbiente', compliance: 'Cumple',      nextReview: addDays(90), aspIdx: 1 },
  { title: 'Ley 2232 de 2022',        issuer: 'Congreso',    compliance: 'No cumple',   nextReview: addDays(45), aspIdx: 3 },
]

const legalIds = []
for (const lr of legalsRaw) {
  const row = await ins('legal_requirements', {
    organization_id: org1.id,
    title: lr.title,
    issuer: lr.issuer,
    next_review: lr.nextReview,
    compliance: lr.compliance,
    ...(aspIds[lr.aspIdx] ? { aspect_id: aspIds[lr.aspIdx] } : {}),
    updated_at: now,
    created_at: now,
  })
  legalIds.push(row?.id ?? null)
  const days = Math.ceil((new Date(lr.nextReview) - new Date()) / 86400000)
  console.log(`  ✓ ${lr.title} → ${lr.compliance} (vence en ${days} días)`)
}

// ── AUDITORÍAS ────────────────────────────────────────────────────────────────

console.log('\n📋  Auditorías...')

// auditor_id es NOT NULL: buscar el primer usuario de org1 (o saltear si no existe aún)
const orgUsers = await q(`SELECT id FROM users WHERE organization_id = $1 LIMIT 1`, [org1.id])
const placeholderAuditorId = orgUsers[0]?.id ?? null

const auditsRaw = [
  { area: 'Producción',          scope: 'Gestión de emisiones y consumo de agua',    criteria: 'ISO 14001:2015 §8.1 y §8.2', date: addDays(7),  status: 'Programada'   },
  { area: 'Gestión de residuos', scope: 'Manejo de residuos peligrosos y ordinarios', criteria: 'ISO 14001:2015 §8.1',       date: addDays(-7), status: 'En ejecución' },
]

const auditIds = []
if (!placeholderAuditorId) {
  console.log('  ⚠️  Sin usuarios en org1 — auditorías omitidas. Regístrarte primero y vuelve a correr el seed.')
} else {
  for (const aud of auditsRaw) {
    const row = await ins('audits', {
      organization_id: org1.id,
      area: aud.area,
      scope: aud.scope,
      criteria: aud.criteria,
      date: aud.date,
      auditor_id: placeholderAuditorId,
      status: aud.status,
      updated_at: now,
      created_at: now,
    })
    auditIds.push(row?.id ?? null)
    console.log(`  ✓ ${aud.area} → ${aud.status}`)
  }
}

// ── NO CONFORMIDADES ──────────────────────────────────────────────────────────

console.log('\n⚠️  No conformidades...')

const ncsRaw = [
  { code: 'NC-001', description: 'Vertimiento de aguas residuales fuera de parámetros',    origin: 'Requisito legal', criticality: 'Crítica', status: 'Escalada'     },
  { code: 'NC-002', description: 'Segregación inadecuada de residuos peligrosos',           origin: 'Auditoría',       criticality: 'Normal',  status: 'En análisis'  },
  { code: 'NC-003', description: 'Falta de registros de consumo de agua en producción',     origin: 'Auditoría',       criticality: 'Normal',  status: 'En ejecución' },
]

for (const nc of ncsRaw) {
  const row = await ins('non_conformities', {
    organization_id: org1.id,
    code: nc.code,
    description: nc.description,
    origin: nc.origin,
    criticality: nc.criticality,
    status: nc.status,
    updated_at: now,
    created_at: now,
  })
  console.log(`  ${row ? '✓' : '⚠ ya existe'} ${nc.code} → ${nc.status}`)
}

// ── INCIDENTES ────────────────────────────────────────────────────────────────

console.log('\n🚨  Incidentes...')

const incidentsRaw = [
  { type: 'incidente',  description: 'Derrame menor de aceite hidráulico en mantenimiento', severity: 'Media', status: 'En seguimiento' },
  { type: 'emergencia', description: 'Fuga en tanque de almacenamiento de químicos',         severity: 'Alta',  status: 'Cerrado'       },
]

for (const inc of incidentsRaw) {
  const row = await ins('incidents', {
    organization_id: org1.id,
    type: inc.type,
    description: inc.description,
    date: addDays(-7),
    location: 'Planta principal',
    severity: inc.severity,
    response_plan: 'Ver POE-001 procedimiento de emergencias',
    status: inc.status,
    updated_at: now,
    created_at: now,
  })
  console.log(`  ${row ? '✓' : '⚠ ya existe'} ${inc.type}: ${inc.description.slice(0, 45)}...`)
}

// ── RESUMEN ───────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(58))
console.log('✅  SEED COMPLETADO')
console.log('═'.repeat(58))
console.log(`
Datos creados en EcoVerde S.A.S.:
  • 5 aspectos  (2 Alta, 1 Media, 1 Baja, 1 Pendiente)
  • 4 requisitos legales (1 por vencer en 10 días — RN-03)
  • 2 auditorías (1 Programada, 1 En ejecución)
  • 3 no conformidades (1 Escalada, 1 En análisis, 1 En ejecución)
  • 2 incidentes (1 En seguimiento, 1 Cerrado)

AmbienTech Ltda. creada vacía → prueba de aislamiento (CP-02).

PRÓXIMOS PASOS:
  1. Ir a http://localhost:3000
  2. Registrarse con correo corporativo (ej. admin@ecoverde.co)
  3. Activar la org desde http://localhost:3000/admin → Organizations
  4. Explorar los módulos con los datos precargados
`)

await client.end()
