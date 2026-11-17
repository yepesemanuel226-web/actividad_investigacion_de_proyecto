import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// Ruta de seed completo para demo/video
// Acceder UNA vez: /api/seed-demo
// ELIMINAR después del video

const DEMO_PASSWORD = 'Demo1234!'

export async function GET() {
  try {
    const payload = await getPayload({ config })

    // ── 1. Verificar si ya fue ejecutado ──────────────────────────────────
    const existingOrgs = await payload.find({
      collection: 'organizations',
      where: { nit: { equals: '900.123.456-7' } },
      overrideAccess: true,
      limit: 1,
    })

    // ── 2. Crear / reutilizar organizaciones ──────────────────────────────
    let org1: any, org2: any

    if (existingOrgs.docs.length > 0) {
      org1 = existingOrgs.docs[0]
    } else {
      org1 = await payload.create({
        collection: 'organizations',
        data: {
          name: 'EcoVerde S.A.S.',
          nit: '900.123.456-7',
          sector: 'Manufactura',
          status: 'active',
        } as any,
        overrideAccess: true,
      })
    }

    const existingOrg2 = await payload.find({
      collection: 'organizations',
      where: { nit: { equals: '800.987.654-3' } },
      overrideAccess: true,
      limit: 1,
    })
    if (existingOrg2.docs.length > 0) {
      org2 = existingOrg2.docs[0]
    } else {
      org2 = await payload.create({
        collection: 'organizations',
        data: {
          name: 'AmbienTech Ltda.',
          nit: '800.987.654-3',
          sector: 'Tecnología',
          status: 'active',
        } as any,
        overrideAccess: true,
      })
    }

    // ── 3. Crear usuarios (uno por rol en org1 + 1 admin en org2) ─────────
    const usersToCreate = [
      { email: 'admin@ecoverde.co',       name: 'Emanuel Admin',       role: 'administrator',         org: org1.id },
      { email: 'direccion@ecoverde.co',   name: 'Carlos Directivo',    role: 'senior_management',     org: org1.id },
      { email: 'ambiental@ecoverde.co',   name: 'María Rodríguez',     role: 'environmental_manager', org: org1.id },
      { email: 'auditor@ecoverde.co',     name: 'Laura Gómez',         role: 'auditor',               org: org1.id },
      { email: 'colaborador@ecoverde.co', name: 'Santiago Díaz',       role: 'collaborator',          org: org1.id },
      { email: 'proveedor@ecoverde.co',   name: 'EcoPack SAS',         role: 'supplier',              org: org1.id },
      { email: 'admin@ambientech.co',     name: 'Ana Torres',          role: 'administrator',         org: org2.id },
    ]

    const createdUsers: Record<string, any> = {}
    for (const u of usersToCreate) {
      const existing = await payload.find({
        collection: 'users',
        where: { email: { equals: u.email } },
        overrideAccess: true,
        limit: 1,
      })
      if (existing.docs.length > 0) {
        createdUsers[u.role + u.org] = existing.docs[0]
        continue
      }
      const user = await payload.create({
        collection: 'users',
        data: {
          name: u.name,
          email: u.email,
          password: DEMO_PASSWORD,
          role: u.role as any,
          organization: u.org,
          active: true,
        } as any,
        overrideAccess: true,
      })
      createdUsers[u.role + u.org] = user
    }

    const envManager = createdUsers['environmental_manager' + org1.id]
    const auditor    = createdUsers['auditor' + org1.id]

    // ── 4. Aspectos ───────────────────────────────────────────────────────
    const aspectsData = [
      { activity: 'Operación de caldera',   name: 'Consumo de agua',                    impact: 'Agotamiento del recurso hídrico',       sev: 4, freq: 5, scope: 3 },
      { activity: 'Gestión de residuos',    name: 'Generación de residuos peligrosos',  impact: 'Contaminación de suelo',               sev: 3, freq: 4, scope: 4 },
      { activity: 'Operación de caldera',   name: 'Emisiones atmosféricas',             impact: 'Deterioro de calidad del aire',         sev: 5, freq: 3, scope: 5 },
      { activity: 'Administración general', name: 'Consumo de papel',                   impact: 'Agotamiento de recursos forestales',    sev: 2, freq: 3, scope: 3 },
      { activity: 'Proceso de lavado',      name: 'Vertimiento de aguas residuales',    impact: 'Contaminación hídrica',                 sev: null, freq: null, scope: null },
    ]

    const aspectIds: any[] = []
    for (const a of aspectsData) {
      const existing = await payload.find({
        collection: 'aspects',
        where: {
          AND: [
            { organization: { equals: org1.id } },
            { name: { equals: a.name } },
          ],
        },
        overrideAccess: true,
        limit: 1,
      })
      if (existing.docs.length > 0) {
        aspectIds.push(existing.docs[0])
        continue
      }
      const sig = a.sev != null ? a.sev! * a.freq! * a.scope! : null
      const level = sig === null ? 'Pendiente' : sig >= 60 ? 'Alta' : sig >= 27 ? 'Media' : 'Baja'
      const asp = await payload.create({
        collection: 'aspects',
        data: {
          organization: org1.id,
          activity: a.activity,
          name: a.name,
          impact: a.impact,
          ...(a.sev != null ? { severity: a.sev, frequency: a.freq, scope: a.scope, significance: sig } : {}),
          level,
          ...(envManager ? { createdBy: envManager.id } : {}),
        } as any,
        overrideAccess: true,
      })
      aspectIds.push(asp)
    }

    // ── 5. Requisitos legales ─────────────────────────────────────────────
    const addDays = (d: number) => { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString() }

    const legalsData = [
      { title: 'Resolución 0631 de 2015', issuer: 'MinAmbiente', compliance: 'Cumple',      nextReview: addDays(60), aspIdx: 2 },
      { title: 'Decreto 1076 de 2015',    issuer: 'MinAmbiente', compliance: 'Sin evaluar', nextReview: addDays(10), aspIdx: 0 },
      { title: 'Resolución 2184 de 2019', issuer: 'MinAmbiente', compliance: 'Cumple',      nextReview: addDays(90), aspIdx: 1 },
      { title: 'Ley 2232 de 2022',        issuer: 'Congreso',    compliance: 'No cumple',   nextReview: addDays(45), aspIdx: 3 },
    ]

    const legalIds: any[] = []
    for (const lr of legalsData) {
      const existing = await payload.find({
        collection: 'legal-requirements',
        where: { AND: [{ organization: { equals: org1.id } }, { title: { equals: lr.title } }] },
        overrideAccess: true,
        limit: 1,
      })
      if (existing.docs.length > 0) { legalIds.push(existing.docs[0]); continue }
      const legal = await payload.create({
        collection: 'legal-requirements',
        data: {
          organization: org1.id,
          title: lr.title,
          issuer: lr.issuer,
          nextReview: lr.nextReview,
          compliance: lr.compliance as any,
          ...(aspectIds[lr.aspIdx] ? { aspect: aspectIds[lr.aspIdx].id } : {}),
          ...(envManager ? { responsible: envManager.id } : {}),
        } as any,
        overrideAccess: true,
      })
      legalIds.push(legal)
    }

    // ── 6. Objetivos ──────────────────────────────────────────────────────
    const objectivesData = [
      { title: 'Reducir el consumo de agua', indicator: 'Consumo mensual de agua', target: 50, currentValue: 41, unit: 'm³', status: 'Activo', deadline: addDays(30) },
      { title: 'Aprovechamiento de residuos ordinarios', indicator: 'Porcentaje de aprovechamiento', target: 100, currentValue: 64, unit: '%', status: 'Activo', deadline: addDays(45) },
      { title: 'Disminuir consumo energético', indicator: 'Consumo mensual de energía', target: 50, currentValue: 23, unit: 'MWh', status: 'Desviado', deadline: addDays(-5) },
      { title: 'Eliminar plásticos de un solo uso', indicator: 'Reducción de plásticos', target: 100, currentValue: 20, unit: '%', status: 'En aprobación', deadline: addDays(90) },
      { title: 'Formación ambiental del personal', indicator: 'Personal capacitado', target: 95, currentValue: 95, unit: '%', status: 'Cumplido', deadline: addDays(-30) },
    ]

    for (const obj of objectivesData) {
      const existing = await payload.find({
        collection: 'objectives',
        where: { AND: [{ organization: { equals: org1.id } }, { title: { equals: obj.title } }] },
        overrideAccess: true,
        limit: 1,
      })
      if (existing.docs.length > 0) continue
      await payload.create({
        collection: 'objectives',
        data: {
          organization: org1.id,
          title: obj.title,
          indicator: obj.indicator,
          target: obj.target,
          currentValue: obj.currentValue,
          unit: obj.unit,
          status: obj.status as any,
          deadline: obj.deadline,
          ...(envManager ? { owner: envManager.id } : {}),
          actions: [{
            description: 'Implementar medidas de ahorro',
            resources: 'Equipo ambiental y mantenimiento',
            deadline: obj.deadline,
            ...(envManager ? { responsible: envManager.id } : {}),
            completed: obj.status === 'Cumplido',
          }],
        } as any,
        overrideAccess: true,
      })
    }

    // ── 7. Auditorías ─────────────────────────────────────────────────────
    const auditsData = [
      { area: 'Producción',          scope: 'Gestión de emisiones y consumo de agua',    criteria: 'ISO 14001:2015 §8.1 y §8.2', date: addDays(7),   status: 'Programada'   },
      { area: 'Gestión de residuos', scope: 'Manejo de residuos peligrosos y ordinarios', criteria: 'ISO 14001:2015 §8.1',       date: addDays(-7),  status: 'En ejecución' },
      { area: 'Compras',             scope: 'Evaluación de proveedores ambientales',       criteria: 'ISO 14001:2015 §8.4',       date: addDays(-30), status: 'Cerrada'      },
    ]

    const auditIds: any[] = []
    for (const aud of auditsData) {
      const existing = await payload.find({
        collection: 'audits',
        where: { AND: [{ organization: { equals: org1.id } }, { area: { equals: aud.area } }] },
        overrideAccess: true,
        limit: 1,
      })
      if (existing.docs.length > 0) { auditIds.push(existing.docs[0]); continue }
      const audit = await payload.create({
        collection: 'audits',
        data: {
          organization: org1.id,
          area: aud.area,
          scope: aud.scope,
          criteria: aud.criteria,
          date: aud.date,
          status: aud.status as any,
          ...(auditor ? { auditor: auditor.id } : (envManager ? { auditor: envManager.id } : {})),
        } as any,
        overrideAccess: true,
      })
      auditIds.push(audit)
    }

    // ── 8. No conformidades ───────────────────────────────────────────────
    const ncsData = [
      { code: 'NC-001', description: 'Vertimiento de aguas residuales fuera de parámetros permitidos',  origin: 'Requisito legal', criticality: 'Crítica', status: 'Escalada'       },
      { code: 'NC-002', description: 'Segregación inadecuada de residuos peligrosos en bodega sur',      origin: 'Auditoría',       criticality: 'Normal',  status: 'En análisis'    },
      { code: 'NC-003', description: 'Falta de registros de consumo de agua en el área de producción',   origin: 'Auditoría',       criticality: 'Normal',  status: 'En ejecución'   },
      { code: 'NC-004', description: 'Proveedor sin certificación ambiental vigente',                     origin: 'Auditoría',       criticality: 'Normal',  status: 'En verificación'},
    ]

    for (const nc of ncsData) {
      const existing = await payload.find({
        collection: 'non-conformities',
        where: { AND: [{ organization: { equals: org1.id } }, { code: { equals: nc.code } }] },
        overrideAccess: true,
        limit: 1,
      })
      if (existing.docs.length > 0) continue
      await payload.create({
        collection: 'non-conformities',
        data: {
          organization: org1.id,
          code: nc.code,
          description: nc.description,
          origin: nc.origin as any,
          criticality: nc.criticality as any,
          status: nc.status as any,
          ...(envManager ? { owner: envManager.id } : {}),
        } as any,
        overrideAccess: true,
      })
    }

    // ── 9. Incidentes ─────────────────────────────────────────────────────
    const incidentsData = [
      { type: 'incidente',  description: 'Derrame menor de aceite hidráulico en mantenimiento', severity: 'Media', status: 'En seguimiento', date: addDays(-8) },
      { type: 'emergencia', description: 'Fuga en tanque de almacenamiento de químicos',         severity: 'Alta',  status: 'Cerrado',        date: addDays(-20) },
      { type: 'incidente',  description: 'Disposición incorrecta de residuos de laboratorio',    severity: 'Baja',  status: 'Cerrado',        date: addDays(-35) },
    ]

    for (const inc of incidentsData) {
      const existing = await payload.find({
        collection: 'incidents',
        where: { AND: [{ organization: { equals: org1.id } }, { description: { equals: inc.description } }] },
        overrideAccess: true,
        limit: 1,
      })
      if (existing.docs.length > 0) continue
      await payload.create({
        collection: 'incidents',
        data: {
          organization: org1.id,
          type: inc.type as any,
          description: inc.description,
          date: inc.date,
          location: 'Planta principal EcoVerde',
          severity: inc.severity as any,
          responsePlan: 'Activar protocolo POE-001 de respuesta a emergencias ambientales',
          status: inc.status as any,
          ...(envManager ? { reportedBy: envManager.id } : {}),
        } as any,
        overrideAccess: true,
      })
    }

    // ── 10. Capacitaciones ────────────────────────────────────────────────
    const trainingsData = [
      { topic: 'Manejo integral de residuos sólidos',  date: addDays(-15), result: 92, competent: 'sí' },
      { topic: 'Respuesta a emergencias ambientales',  date: addDays(-25), result: 86, competent: 'sí' },
      { topic: 'ISO 14001:2015 — Fundamentos',         date: addDays(-40), result: 78, competent: 'no' },
    ]

    if (envManager) {
      for (const tr of trainingsData) {
        const existing = await payload.find({
          collection: 'trainings',
          where: { AND: [{ organization: { equals: org1.id } }, { topic: { equals: tr.topic } }] },
          overrideAccess: true,
          limit: 1,
        })
        if (existing.docs.length > 0) continue
        await payload.create({
          collection: 'trainings',
          data: {
            organization: org1.id,
            topic: tr.topic,
            date: tr.date,
            attendee: envManager.id,
            result: tr.result,
            competent: tr.competent as any,
          } as any,
          overrideAccess: true,
        })
      }
    }

    // ── 11. Notificaciones ────────────────────────────────────────────────
    if (envManager) {
      const notifsData = [
        { type: 'legal-expiry',       message: 'Vence en 10 días la revisión del Decreto 1076 de 2015.' },
        { type: 'nc-created',         message: 'Nueva no conformidad NC-001: Vertimiento fuera de parámetro.' },
        { type: 'objective-deviated', message: 'El objetivo "Disminuir consumo energético" venció sin alcanzar la meta.' },
        { type: 'audit-scheduled',    message: 'Auditoría programada en Producción para los próximos 7 días.' },
        { type: 'aspect-pending',     message: 'Faltan datos para calcular la significancia del aspecto "Vertimiento".' },
        { type: 'evidence-uploaded',  message: 'EcoPack SAS cargó una evidencia para revisar.' },
      ]

      for (const n of notifsData) {
        const existing = await payload.find({
          collection: 'notifications',
          where: { AND: [{ user: { equals: envManager.id } }, { message: { equals: n.message } }] },
          overrideAccess: true,
          limit: 1,
        })
        if (existing.docs.length > 0) continue
        await payload.create({
          collection: 'notifications',
          data: {
            user: envManager.id,
            type: n.type,
            message: n.message,
            read: false,
          } as any,
          overrideAccess: true,
        })
      }
    }

    // ── Respuesta final ───────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      message: '✅ Seed completado. Elimina esta ruta después del video.',
      credenciales: {
        contraseña_todos: DEMO_PASSWORD,
        organización_1: 'EcoVerde S.A.S.',
        usuarios_org1: [
          { rol: 'Administrador',          email: 'admin@ecoverde.co',       contraseña: DEMO_PASSWORD },
          { rol: 'Alta dirección',         email: 'direccion@ecoverde.co',   contraseña: DEMO_PASSWORD },
          { rol: 'Responsable ambiental',  email: 'ambiental@ecoverde.co',   contraseña: DEMO_PASSWORD },
          { rol: 'Auditor',                email: 'auditor@ecoverde.co',     contraseña: DEMO_PASSWORD },
          { rol: 'Colaborador',            email: 'colaborador@ecoverde.co', contraseña: DEMO_PASSWORD },
          { rol: 'Proveedor',              email: 'proveedor@ecoverde.co',   contraseña: DEMO_PASSWORD },
        ],
        organización_2: 'AmbienTech Ltda. (para probar aislamiento)',
        usuarios_org2: [
          { rol: 'Administrador', email: 'admin@ambientech.co', contraseña: DEMO_PASSWORD },
        ],
      },
      datos_creados: {
        aspectos: 5,
        requisitos_legales: 4,
        objetivos: 5,
        auditorias: 3,
        no_conformidades: 4,
        incidentes: 3,
        capacitaciones: 3,
        notificaciones: 6,
      },
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
