/**
 * EcoCert 360 — Seed de producción
 * Inyecta datos directamente en Supabase vía SQL.
 * Los usuarios se crean registrándose en la web.
 *
 * Uso: node scripts/seed-prod.mjs
 */

import { readFileSync } from 'fs'
import pg from 'pg'

const { Client } = pg

try {
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  for (const line of env.split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && v.length) process.env[k.trim()] = v.join('=').trim()
  }
} catch {}

const DB_URL = process.env.DATABASE_URL
if (!DB_URL) { console.error('❌  DATABASE_URL no encontrado'); process.exit(1) }

const client = new Client({ connectionString: DB_URL })
await client.connect()
console.log('✅  Conectado a Supabase\n')

const q = async (sql, p = []) => (await client.query(sql, p)).rows
const now = new Date().toISOString()
const addDays = (d) => { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString() }

// ── Obtener org1 (la primera org activa) ─────────────────────────────────────
const orgs = await q(`SELECT id, name FROM organizations WHERE status = 'active' ORDER BY created_at LIMIT 2`)
if (orgs.length === 0) {
  console.error('❌  No hay organizaciones activas. Regístrate primero en la web y vuelve a correr el seed.')
  await client.end()
  process.exit(1)
}

const org1 = orgs[0]
const org2 = orgs[1] ?? null
console.log(`🏢  Org principal: ${org1.name} (id: ${org1.id})`)
if (org2) console.log(`🏢  Org secundaria: ${org2.name} (id: ${org2.id})`)

// Obtener usuario de org1 para foreign keys
const users1 = await q(`SELECT id, role FROM users WHERE organization_id = $1 LIMIT 10`, [org1.id])
const envManager = users1.find(u => u.role === 'environmental_manager') ?? users1[0] ?? null
const auditorUser = users1.find(u => u.role === 'auditor') ?? users1[0] ?? null
console.log(`👤  Usuario principal: ${envManager ? `id ${envManager.id} (${envManager.role})` : 'ninguno — solo se crea estructura de datos'}`)

const ins = async (table, data) => {
  const existing = await q(`SELECT id FROM "${table}" WHERE id IS NOT NULL LIMIT 0`) // just check table exists
  const keys = Object.keys(data)
  const vals = Object.values(data)
  const cols = keys.map(k => `"${k}"`).join(', ')
  const ph   = keys.map((_, i) => `$${i + 1}`).join(', ')
  const rows = await q(`INSERT INTO "${table}" (${cols}) VALUES (${ph}) ON CONFLICT DO NOTHING RETURNING *`, vals)
  return rows[0]
}

// ── ASPECTOS ──────────────────────────────────────────────────────────────────
console.log('\n🌿  Aspectos...')
const aspectsRaw = [
  { activity: 'Operación de caldera',   name: 'Consumo de agua',                    impact: 'Agotamiento del recurso hídrico',       sev: 4, freq: 5, scope: 3 },
  { activity: 'Gestión de residuos',    name: 'Generación de residuos peligrosos',  impact: 'Contaminación de suelo',               sev: 3, freq: 4, scope: 4 },
  { activity: 'Operación de caldera',   name: 'Emisiones atmosféricas',             impact: 'Deterioro de calidad del aire',         sev: 5, freq: 3, scope: 5 },
  { activity: 'Administración general', name: 'Consumo de papel',                   impact: 'Agotamiento de recursos forestales',    sev: 2, freq: 3, scope: 3 },
  { activity: 'Proceso de lavado',      name: 'Vertimiento de aguas residuales',    impact: 'Contaminación hídrica',                 sev: null, freq: null, scope: null },
]

const aspIds = []
for (const a of aspectsRaw) {
  const existing = await q(`SELECT id FROM aspects WHERE organization_id = $1 AND name = $2 LIMIT 1`, [org1.id, a.name])
  if (existing[0]) { aspIds.push(existing[0].id); console.log(`  ⚠ ya existe: ${a.name}`); continue }
  const sig = a.sev != null ? a.sev * a.freq * a.scope : null
  const level = sig === null ? 'Pendiente' : sig >= 60 ? 'Alta' : sig >= 27 ? 'Media' : 'Baja'
  const row = await ins('aspects', {
    organization_id: org1.id,
    activity: a.activity,
    name: a.name,
    impact: a.impact,
    ...(a.sev != null ? { severity: a.sev, frequency: a.freq, scope: a.scope, significance: sig } : {}),
    level,
    ...(envManager ? { created_by_id: envManager.id } : {}),
    updated_at: now, created_at: now,
  })
  aspIds.push(row?.id ?? null)
  console.log(`  ✓ ${a.name} → ${level}${sig ? ` (${sig})` : ''}`)
}

// ── REQUISITOS LEGALES ────────────────────────────────────────────────────────
console.log('\n⚖️  Requisitos legales...')
const legalsRaw = [
  { title: 'Resolución 0631 de 2015', issuer: 'MinAmbiente', compliance: 'Cumple',      next: addDays(60),  aspIdx: 2 },
  { title: 'Decreto 1076 de 2015',    issuer: 'MinAmbiente', compliance: 'Sin evaluar', next: addDays(10),  aspIdx: 0 },
  { title: 'Resolución 2184 de 2019', issuer: 'MinAmbiente', compliance: 'Cumple',      next: addDays(90),  aspIdx: 1 },
  { title: 'Ley 2232 de 2022',        issuer: 'Congreso',    compliance: 'No cumple',   next: addDays(45),  aspIdx: 3 },
]

const legalIds = []
for (const lr of legalsRaw) {
  const existing = await q(`SELECT id FROM legal_requirements WHERE organization_id = $1 AND title = $2 LIMIT 1`, [org1.id, lr.title])
  if (existing[0]) { legalIds.push(existing[0].id); console.log(`  ⚠ ya existe: ${lr.title}`); continue }
  const row = await ins('legal_requirements', {
    organization_id: org1.id,
    title: lr.title,
    issuer: lr.issuer,
    next_review: lr.next,
    compliance: lr.compliance,
    ...(aspIds[lr.aspIdx] ? { aspect_id: aspIds[lr.aspIdx] } : {}),
    ...(envManager ? { responsible_id: envManager.id } : {}),
    updated_at: now, created_at: now,
  })
  legalIds.push(row?.id ?? null)
  const days = Math.ceil((new Date(lr.next) - new Date()) / 86400000)
  console.log(`  ✓ ${lr.title} → ${lr.compliance} (vence en ${days}d)`)
}

// ── OBJETIVOS ─────────────────────────────────────────────────────────────────
console.log('\n🎯  Objetivos...')
const objRaw = [
  { title: 'Reducir el consumo de agua',           indicator: 'Consumo mensual m³',   target: 50,  current: 41,  unit: 'm³',  status: 'Activo',        deadline: addDays(30) },
  { title: 'Aprovechamiento de residuos',           indicator: '% aprovechamiento',    target: 100, current: 64,  unit: '%',   status: 'Activo',        deadline: addDays(45) },
  { title: 'Disminuir consumo energético',          indicator: 'Consumo MWh/mes',      target: 50,  current: 23,  unit: 'MWh', status: 'Desviado',      deadline: addDays(-5) },
  { title: 'Eliminar plásticos de un solo uso',     indicator: '% reducción',          target: 100, current: 20,  unit: '%',   status: 'En aprobación', deadline: addDays(90) },
  { title: 'Formación ambiental del personal',      indicator: '% personal capacitado', target: 95,  current: 95,  unit: '%',   status: 'Cumplido',      deadline: addDays(-30) },
]

for (const o of objRaw) {
  const existing = await q(`SELECT id FROM objectives WHERE organization_id = $1 AND title = $2 LIMIT 1`, [org1.id, o.title])
  if (existing[0]) { console.log(`  ⚠ ya existe: ${o.title}`); continue }
  const row = await ins('objectives', {
    organization_id: org1.id,
    title: o.title,
    indicator: o.indicator,
    target: o.target,
    current_value: o.current,
    unit: o.unit,
    status: o.status,
    deadline: o.deadline,
    ...(envManager ? { owner_id: envManager.id } : {}),
    updated_at: now, created_at: now,
  })
  console.log(`  ✓ ${o.title} → ${o.status}`)

  // Agregar una acción al plan de objetivos
  if (row?.id) {
    const { randomUUID } = await import('crypto')
    await ins('objectives_actions', {
      id: randomUUID(),
      _order: 1,
      _parent_id: row.id,
      description: 'Implementar medidas de mejora y seguimiento mensual',
      resources: 'Equipo ambiental y de mantenimiento',
      deadline: o.deadline,
      completed: o.status === 'Cumplido',
      ...(envManager ? { responsible_id: envManager.id } : {}),
    })
  }
}

// ── AUDITORÍAS ────────────────────────────────────────────────────────────────
console.log('\n📋  Auditorías...')
if (!auditorUser && !envManager) {
  console.log('  ⚠ Sin usuarios — auditorías omitidas')
} else {
  const audRaw = [
    { area: 'Producción',          scope: 'Gestión de emisiones y consumo de agua',     criteria: 'ISO 14001:2015 §8.1 y §8.2', date: addDays(7),   status: 'Programada'   },
    { area: 'Gestión de residuos', scope: 'Manejo de residuos peligrosos y ordinarios', criteria: 'ISO 14001:2015 §8.1',         date: addDays(-7),  status: 'En ejecución' },
    { area: 'Compras',             scope: 'Evaluación de proveedores ambientales',       criteria: 'ISO 14001:2015 §8.4',         date: addDays(-30), status: 'Cerrada'      },
  ]
  for (const a of audRaw) {
    const existing = await q(`SELECT id FROM audits WHERE organization_id = $1 AND area = $2 LIMIT 1`, [org1.id, a.area])
    if (existing[0]) { console.log(`  ⚠ ya existe: ${a.area}`); continue }
    await ins('audits', {
      organization_id: org1.id,
      area: a.area,
      scope: a.scope,
      criteria: a.criteria,
      date: a.date,
      auditor_id: auditorUser?.id ?? envManager?.id,
      status: a.status,
      updated_at: now, created_at: now,
    })
    console.log(`  ✓ ${a.area} → ${a.status}`)
  }
}

// ── NO CONFORMIDADES ──────────────────────────────────────────────────────────
console.log('\n⚠️  No conformidades...')
const ncRaw = [
  { code: 'NC-001', desc: 'Vertimiento de aguas residuales fuera de parámetros',   origin: 'Requisito legal', crit: 'Crítica', status: 'Escalada'       },
  { code: 'NC-002', desc: 'Segregación inadecuada de residuos peligrosos',          origin: 'Auditoría',       crit: 'Normal',  status: 'En análisis'    },
  { code: 'NC-003', desc: 'Falta de registros de consumo de agua en producción',    origin: 'Auditoría',       crit: 'Normal',  status: 'En ejecución'   },
  { code: 'NC-004', desc: 'Proveedor sin certificación ambiental vigente',          origin: 'Auditoría',       crit: 'Normal',  status: 'En verificación'},
]
for (const nc of ncRaw) {
  const existing = await q(`SELECT id FROM non_conformities WHERE organization_id = $1 AND code = $2 LIMIT 1`, [org1.id, nc.code])
  if (existing[0]) { console.log(`  ⚠ ya existe: ${nc.code}`); continue }
  await ins('non_conformities', {
    organization_id: org1.id,
    code: nc.code,
    description: nc.desc,
    origin: nc.origin,
    criticality: nc.crit,
    status: nc.status,
    ...(envManager ? { owner_id: envManager.id } : {}),
    updated_at: now, created_at: now,
  })
  console.log(`  ✓ ${nc.code} → ${nc.status}`)
}

// ── INCIDENTES ────────────────────────────────────────────────────────────────
console.log('\n🚨  Incidentes...')
const incRaw = [
  { type: 'incidente',  desc: 'Derrame menor de aceite hidráulico en mantenimiento', sev: 'Media', status: 'En seguimiento', date: addDays(-8) },
  { type: 'emergencia', desc: 'Fuga en tanque de almacenamiento de químicos',         sev: 'Alta',  status: 'Cerrado',        date: addDays(-20) },
  { type: 'incidente',  desc: 'Disposición incorrecta de residuos de laboratorio',    sev: 'Baja',  status: 'Cerrado',        date: addDays(-35) },
]
for (const inc of incRaw) {
  const existing = await q(`SELECT id FROM incidents WHERE organization_id = $1 AND description = $2 LIMIT 1`, [org1.id, inc.desc])
  if (existing[0]) { console.log(`  ⚠ ya existe`); continue }
  await ins('incidents', {
    organization_id: org1.id,
    type: inc.type,
    description: inc.desc,
    date: inc.date,
    location: 'Planta principal',
    severity: inc.sev,
    response_plan: 'Activar protocolo POE-001 de respuesta a emergencias',
    status: inc.status,
    ...(envManager ? { reported_by_id: envManager.id } : {}),
    updated_at: now, created_at: now,
  })
  console.log(`  ✓ ${inc.type}: ${inc.desc.slice(0, 45)}...`)
}

// ── CAPACITACIONES ────────────────────────────────────────────────────────────
console.log('\n📚  Capacitaciones...')
if (envManager) {
  const trainRaw = [
    { topic: 'Manejo integral de residuos sólidos',  date: addDays(-15), result: 92, competent: 'Sí' },
    { topic: 'Respuesta a emergencias ambientales',  date: addDays(-25), result: 86, competent: 'Sí' },
    { topic: 'ISO 14001:2015 — Fundamentos',         date: addDays(-40), result: 78, competent: 'No' },
  ]
  for (const t of trainRaw) {
    const existing = await q(`SELECT id FROM trainings WHERE organization_id = $1 AND topic = $2 LIMIT 1`, [org1.id, t.topic])
    if (existing[0]) { console.log(`  ⚠ ya existe: ${t.topic}`); continue }
    await ins('trainings', {
      organization_id: org1.id,
      topic: t.topic,
      date: t.date,
      attendee_id: envManager.id,
      result: t.result,
      competent: t.competent,
      updated_at: now, created_at: now,
    })
    console.log(`  ✓ ${t.topic} → ${t.competent}`)
  }
} else {
  console.log('  ⚠ Sin usuarios — capacitaciones omitidas')
}

// ── RESUMEN ───────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(55))
console.log('✅  SEED DE PRODUCCIÓN COMPLETADO')
console.log('═'.repeat(55))
console.log(`
Datos inyectados en: ${org1.name}
  • 5 aspectos  (2 Alta, 1 Media, 1 Baja, 1 Pendiente)
  • 4 requisitos legales (1 vence en 10 días)
  • 5 objetivos (Activo, Desviado, En aprobación, Cumplido)
  • 3 auditorías (Programada, En ejecución, Cerrada)
  • 4 no conformidades
  • 3 incidentes
  • 3 capacitaciones (si había usuarios)

USUARIOS — créalos registrándote en la web:
  https://actividad-investigacion-de-proyecto.vercel.app

  Sugerencia de correos corporativos para el video:
  • admin@ecoverde.co          → Administrador (desde /admin)
  • ambiental@ecoverde.co      → Responsable ambiental
  • auditor@ecoverde.co        → Auditor
  • colaborador@ecoverde.co    → Colaborador
  • proveedor@ecoverde.co      → Proveedor
  Contraseña sugerida: Demo1234!
`)
await client.end()
