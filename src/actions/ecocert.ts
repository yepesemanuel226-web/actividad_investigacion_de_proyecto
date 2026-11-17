// @ts-nocheck
'use server'

import { getPayload } from 'payload'
import { cookies } from 'next/headers'
import config from '@/payload.config'

// Payload con PostgreSQL usa IDs numéricos. Esta función convierte cualquier
// ID (string o number) al número que Payload espera en campos de relación.
function toId(id: string | number | undefined): number | undefined {
  if (id === undefined || id === null || id === '') return undefined
  const n = Number(id)
  return isNaN(n) ? undefined : n
}

type ActionResult<T = unknown> = Promise<{ success: boolean; data?: T; error?: string }>

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function loginUser(email: string, password: string): ActionResult {
  try {
    const payload = await getPayload({ config })
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
      overrideAccess: false,
    })

    // Verificar estado de la organización
    const user = result.user as unknown as {
      organization?: { id?: number; status?: string; name?: string } | number | null
    }
    const org = user?.organization
    const orgStatus = typeof org === 'object' && org !== null
      ? (org as { status?: string }).status
      : null
    const orgName = typeof org === 'object' && org !== null
      ? (org as { name?: string }).name ?? ''
      : ''

    if (orgStatus === 'pending') {
      return {
        success: false,
        error: 'pending',
        data: { pending: true, orgName },
      }
    }
    if (orgStatus === 'suspended') {
      return {
        success: false,
        error: 'Tu organización ha sido suspendida. Contacta al administrador.',
      }
    }

    return { success: true, data: result.user }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function registerUser({
  orgName,
  nit,
  sector,
  name,
  email,
  password,
  role,
}: {
  orgName: string
  nit: string
  sector: string
  name: string
  email: string
  password: string
  role?: string
}): ActionResult {
  // ── Input validation ──────────────────────────────────────────────────────
  if (!orgName?.trim() || orgName.trim().length < 2)
    return { success: false, error: 'Nombre de organización inválido (mínimo 2 caracteres)' }
  if (!nit?.trim() || !/^[\d.\-]+$/.test(nit.trim()))
    return { success: false, error: 'NIT inválido (solo dígitos, puntos y guiones)' }
  if (!email?.includes('@') || email.length < 5)
    return { success: false, error: 'Correo electrónico inválido' }
  if (!password || password.length < 8)
    return { success: false, error: 'La contraseña debe tener al menos 8 caracteres' }
  if (!name?.trim() || name.trim().length < 2)
    return { success: false, error: 'Nombre inválido (mínimo 2 caracteres)' }
  // ─────────────────────────────────────────────────────────────────────────
  try {
    const payload = await getPayload({ config })

    // ── Server-side role enforcement ──────────────────────────────────────
    // El primer usuario de una organización siempre es Responsable Ambiental.
    // Administrador y Alta Dirección solo se asignan desde el panel /admin.
    const RESTRICTED_ROLES = ['administrator', 'senior_management']
    const safeRole = RESTRICTED_ROLES.includes(role ?? '') ? 'environmental_manager' : (role ?? 'environmental_manager')
    // ─────────────────────────────────────────────────────────────────────

    // Durante el registro no hay sesión activa, se usa overrideAccess: true
    // para las operaciones del sistema (crear org y usuario inicial).
    // La política de acceso de Organizations ya permite create: () => true,
    // pero Users.organizationField es required y no hay usuario autenticado aún.
    const org = await payload.create({
      collection: 'organizations',
      data: {
        name: orgName,
        nit,
        sector,
        status: 'active',
        requestedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    })

    await payload.create({
      collection: 'users',
      data: {
        name,
        email,
        password,
        role: safeRole as 'environmental_manager',
        organization: org.id as number,
        active: true,
      },
      overrideAccess: true,
    })

    // Org activa directamente — iniciar sesión automáticamente
    return loginUser(email, password)
  } catch (e: unknown) {
    const msg = (e as Error).message ?? ''
    if (/unique|nit/i.test(msg)) {
      return { success: false, error: 'Ya existe una organización registrada con ese NIT.' }
    }
    return { success: false, error: msg }
  }
}

// Verifica el estado de la organización de un usuario.
// Retorna: { status: 'active' | 'pending' | 'suspended', orgName: string }
export async function checkOrgStatus(orgId: string | number): ActionResult {
  try {
    const payload = await getPayload({ config })
    const org = await payload.findByID({
      collection: 'organizations',
      id: Number(orgId),
      overrideAccess: true,
    })
    return {
      success: true,
      data: {
        status: (org as unknown as { status?: string }).status ?? 'pending',
        orgName: (org as unknown as { name?: string }).name ?? '',
      },
    }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getCurrentUser(): ActionResult {
  try {
    const payload = await getPayload({ config })
    const cs = await cookies()
    const headers = new Headers({ cookie: cs.toString() })
    const { user } = await payload.auth({ headers })
    return { success: true, data: user ?? null }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Org-access guard
// ---------------------------------------------------------------------------

async function validateOrgAccess(orgId: string | number): Promise<boolean> {
  const userResult = await getCurrentUser()
  if (!userResult.success || !userResult.data) return false
  const user = userResult.data as { organization?: { id?: string | number } | string | number | null }
  const orgRaw = user.organization
  const userOrgId =
    orgRaw && typeof orgRaw === 'object' && 'id' in (orgRaw as object)
      ? (orgRaw as { id?: string | number }).id
      : orgRaw
  if (userOrgId === undefined || userOrgId === null) return false
  return Number(userOrgId) === Number(orgId)
}

// ---------------------------------------------------------------------------
// Notifications & Audit Log (non-blocking helpers)
// ---------------------------------------------------------------------------

export async function createNotification({
  userId,
  type,
  message,
  reference,
}: {
  userId: string | number
  type: string
  message: string
  reference?: string
}): ActionResult {
  try {
    const payload = await getPayload({ config })
    const result = await payload.create({
      collection: 'notifications',
      data: {
        user: toId(userId),
        type,
        message,
        reference,
        read: false,
      },
      overrideAccess: true,
    })
    return { success: true, data: result }
  } catch {
    return { success: false }
  }
}

export async function createAuditLog(
  table: string,
  recordId: string,
  action: 'crear' | 'editar' | 'cambio_estado',
  detail?: string,
  organizationId?: string | number,
  userId?: string | number,
): ActionResult {
  try {
    const payload = await getPayload({ config })

    let resolvedUserId = userId
    if (!resolvedUserId) {
      const userResult = await getCurrentUser()
      if (userResult.success && userResult.data) {
        resolvedUserId = (userResult.data as { id: string | number }).id
      }
    }

    // audit-log is a new collection added in FEAT-001; use 'as any' because
    // payload-types.ts was generated before that collection was added and
    // cannot be regenerated in this environment (requires FIGMA_EID).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = payload as any
    const result = await p.create({
      collection: 'audit-log',
      data: {
        table,
        recordId,
        action,
        detail,
        organization: organizationId ? toId(organizationId) : undefined,
        user: resolvedUserId ? toId(resolvedUserId) : undefined,
        date: new Date().toISOString(),
      },
      overrideAccess: false,
    })
    return { success: true, data: result }
  } catch {
    return { success: false }
  }
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export async function getOrganizations(): ActionResult {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'organizations',
      overrideAccess: false,
      limit: 100,
    })
    return { success: true, data: result.docs }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function getUsers(orgId: string): ActionResult {
  try {
    if (!(await validateOrgAccess(orgId))) return { success: false, error: 'Acceso denegado' }
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'users',
      where: { organization: { equals: Number(orgId) } },
      overrideAccess: false,
      limit: 200,
    })
    return { success: true, data: result.docs }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Aspects (RN-01, RN-02)
// ---------------------------------------------------------------------------

export async function getAspects(orgId: string): ActionResult {
  try {
    if (!(await validateOrgAccess(orgId))) return { success: false, error: 'Acceso denegado' }
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'aspects',
      where: { organization: { equals: Number(orgId) } },
      overrideAccess: false,
      limit: 500,
    })
    return { success: true, data: result.docs }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function createAspect(data: Record<string, unknown>): ActionResult {
  try {
    const payload = await getPayload({ config })

    const severity = data.severity as number | undefined
    const frequency = data.frequency as number | undefined
    const scope = data.scope as number | undefined

    let level: 'Alta' | 'Media' | 'Baja' | 'Pendiente'
    let significance: number | undefined

    if (!severity || !frequency || !scope || severity === 0 || frequency === 0 || scope === 0) {
      level = 'Pendiente'
      // RN-02: notify the creator about missing factors
      const userResult = await getCurrentUser()
      if (userResult.success && userResult.data) {
        const user = userResult.data as { id: string | number }
        await createNotification({
          userId: user.id,
          type: 'warning',
          message:
            'El aspecto ambiental fue creado con factores incompletos. Por favor complete severidad, frecuencia y alcance para calcular el nivel de significancia.',
        })
      }
    } else {
      significance = severity * frequency * scope
      if (significance >= 60) {
        level = 'Alta'
      } else if (significance >= 27) {
        level = 'Media'
      } else {
        level = 'Baja'
      }
    }

    const { severity: _s, frequency: _f, scope: _sc, createdBy: _cb, ...rest } = data
    // Using 'as any' for the data argument because payload-types.ts is stale:
    // the 'createdBy' field on Aspects was added in FEAT-001 but types cannot be
    // regenerated without FIGMA_EID (platform-managed env var, not available here).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = payload as any
    const result = await p.create({
      collection: 'aspects',
      data: {
        ...(rest as {
          organization?: string
          activity?: string
          name?: string
          impact?: string
        }),
        severity: severity ?? undefined,
        frequency: frequency ?? undefined,
        scope: scope ?? undefined,
        significance,
        level,
        createdBy: data.createdBy ? toId(data.createdBy) : undefined,
      },
      overrideAccess: false,
    })

    await createAuditLog(
      'aspects',
      String(result.id),
      'crear',
      `Aspecto creado: ${result.name}`,
      data.organization as string | undefined,
    )

    return { success: true, data: result }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function updateAspect(id: string, data: Record<string, unknown>): ActionResult {
  try {
    const payload = await getPayload({ config })

    let updateData: Record<string, unknown> = { ...data }

    const severity = data.severity as number | undefined
    const frequency = data.frequency as number | undefined
    const scope = data.scope as number | undefined

    if (severity !== undefined || frequency !== undefined || scope !== undefined) {
      const existing = await payload.findByID({
        collection: 'aspects',
        id,
        overrideAccess: true,
      })

      const finalSeverity = severity ?? (existing.severity as number | undefined)
      const finalFrequency = frequency ?? (existing.frequency as number | undefined)
      const finalScope = scope ?? (existing.scope as number | undefined)

      if (
        finalSeverity && finalFrequency && finalScope &&
        finalSeverity > 0 && finalFrequency > 0 && finalScope > 0
      ) {
        const significance = finalSeverity * finalFrequency * finalScope
        let level: 'Alta' | 'Media' | 'Baja'
        if (significance >= 60) {
          level = 'Alta'
        } else if (significance >= 27) {
          level = 'Media'
        } else {
          level = 'Baja'
        }
        updateData = { ...updateData, significance, level }
      }
    }

    const result = await payload.update({
      collection: 'aspects',
      id,
      data: {
        ...(updateData as object),
        ...(typeof (updateData as Record<string, unknown>).organization !== 'undefined'
          ? { organization: toId((updateData as Record<string, unknown>).organization as string | number) }
          : {}),
      } as Parameters<typeof payload.update<'aspects'>>[0]['data'],
      overrideAccess: true,
    })

    await createAuditLog('aspects', String(id), 'editar', 'Aspecto actualizado')

    return { success: true, data: result }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Legal Requirements (RN-04)
// ---------------------------------------------------------------------------

export async function getLegalRequirements(orgId: string): ActionResult {
  try {
    if (!(await validateOrgAccess(orgId))) return { success: false, error: 'Acceso denegado' }
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'legal-requirements',
      where: { organization: { equals: Number(orgId) } },
      overrideAccess: false,
      limit: 500,
    })
    return { success: true, data: result.docs }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function createLegalRequirement(data: Record<string, unknown>): ActionResult {
  try {
    const orgId = data.organization as string | number
    if (!(await validateOrgAccess(orgId))) return { success: false, error: 'Acceso denegado' }
    const payload = await getPayload({ config })
    const result = await payload.create({
      collection: 'legal-requirements',
      data: {
        title: data.title as string,
        issuer: data.issuer as string,
        organization: toId(data.organization as string | number),
        nextReview: data.nextReview as string,
        compliance: data.compliance as 'Cumple' | 'No cumple' | 'Sin evaluar',
        aspect: data.aspect ? toId(data.aspect as string | number) : undefined,
        responsible: data.responsible ? toId(data.responsible as string | number) : undefined,
      },
      overrideAccess: false,
    })

    await createAuditLog(
      'legal-requirements',
      String(result.id),
      'crear',
      `Requisito legal creado: ${result.title}`,
      data.organization as string | undefined,
    )

    return { success: true, data: result }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function updateLegalRequirement(
  id: string,
  data: Record<string, unknown>,
): ActionResult {
  try {
    const payload = await getPayload({ config })

    // (A) Fetch existing doc
    const existing = await payload.findByID({
      collection: 'legal-requirements',
      id,
      overrideAccess: true,
    })

    // (B) RN-04: auto-create NonConformity when compliance changes to 'No cumple'
    if (data.compliance === 'No cumple' && existing.compliance !== 'No cumple') {
      try {
        const orgId =
          typeof existing.organization === 'object' && existing.organization !== null
            ? (existing.organization as { id: string | number }).id
            : existing.organization

        const ncCode = `NC-LR-${Date.now()}`
        const nc = await payload.create({
          collection: 'non-conformities',
          data: {
            organization: toId(orgId),
            code: ncCode,
            description: `No conformidad generada automáticamente por cambio de cumplimiento en requisito legal: ${existing.title}`,
            origin: 'Requisito legal',
            criticality: 'Normal',
            status: 'Detectada',
            legalRequirement: toId(id),
          } as unknown as Parameters<typeof payload.create<'non-conformities'>>[0]['data'],
          overrideAccess: true,
        })

        // Notify responsible user if present
        const responsible = (existing as unknown as { responsible?: string | number | { id: string | number } | null }).responsible
        if (responsible) {
          const responsibleId =
            typeof responsible === 'object' && responsible !== null
              ? responsible.id
              : responsible
          await createNotification({
            userId: responsibleId,
            type: 'non-conformity',
            message: `Se ha generado una no conformidad (${ncCode}) por incumplimiento del requisito legal: ${existing.title}`,
            reference: String(nc.id),
          })
        }
      } catch {
        // swallow — non-blocking
      }
    }

    // (C) Update the legal requirement
    const result = await payload.update({
      collection: 'legal-requirements',
      id,
      data: {
        ...(data.title !== undefined ? { title: data.title as string } : {}),
        ...(data.issuer !== undefined ? { issuer: data.issuer as string } : {}),
        ...(data.organization !== undefined ? { organization: toId(data.organization as string | number) } : {}),
        ...(data.nextReview !== undefined ? { nextReview: data.nextReview as string } : {}),
        ...(data.compliance !== undefined ? { compliance: data.compliance as 'Cumple' | 'No cumple' | 'Sin evaluar' } : {}),
        ...(data.aspect !== undefined ? { aspect: toId(data.aspect as string | number) } : {}),
        ...(data.responsible !== undefined ? { responsible: toId(data.responsible as string | number) } : {}),
      },
      overrideAccess: true,
    })

    // (D) Audit log
    const orgId =
      typeof existing.organization === 'object' && existing.organization !== null
        ? (existing.organization as { id: string | number }).id
        : existing.organization

    await createAuditLog(
      'legal-requirements',
      String(id),
      'cambio_estado',
      'Requisito legal actualizado',
      orgId,
    )

    return { success: true, data: result }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Objectives (RN-05)
// ---------------------------------------------------------------------------

export async function getObjectives(orgId: string): ActionResult {
  try {
    if (!(await validateOrgAccess(orgId))) return { success: false, error: 'Acceso denegado' }
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'objectives',
      where: { organization: { equals: Number(orgId) } },
      overrideAccess: false,
      limit: 500,
    })
    return { success: true, data: result.docs }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function createObjective(data: Record<string, unknown>): ActionResult {
  try {
    // RN-05: validate actions array
    const actions = data.actions as Array<Record<string, unknown>> | undefined
    if (!actions || actions.length < 1) {
      return { success: false, error: 'El objetivo debe tener al menos una acción.' }
    }
    for (const action of actions) {
      if (!action.responsible || !action.resources || !action.deadline) {
        return {
          success: false,
          error: 'Cada acción debe tener responsable, recursos y fecha límite.',
        }
      }
    }

    const payload = await getPayload({ config })
    const result = await payload.create({
      collection: 'objectives',
      data: {
        title: data.title as string,
        indicator: data.indicator as string,
        target: data.target as number,
        unit: data.unit as string,
        deadline: data.deadline as string,
        owner: toId(data.owner as string | number),
        status: (data.status as 'Borrador') ?? 'Borrador',
        organization: toId(data.organization as string | number),
        currentValue: (data.currentValue as number) ?? 0,
        actions: ((data.actions as Array<Record<string, unknown>>) ?? []).map((a) => ({
          description: a.description as string,
          resources: a.resources as string,
          deadline: a.deadline as string,
          responsible: toId(a.responsible as string | number),
          completed: (a.completed as boolean) ?? false,
        })),
      },
      overrideAccess: false,
    })

    await createAuditLog(
      'objectives',
      String(result.id),
      'crear',
      `Objetivo creado: ${result.title}`,
      data.organization as string | undefined,
    )

    return { success: true, data: result }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function updateObjective(id: string, data: Record<string, unknown>): ActionResult {
  try {
    const payload = await getPayload({ config })
    const result = await payload.update({
      collection: 'objectives',
      id,
      data: data as {
        title?: string
        indicator?: string
        target?: number
        unit?: string
        deadline?: string
        owner?: string
        status?: 'Borrador' | 'En aprobación' | 'Activo' | 'Desviado' | 'Cumplido' | 'Cancelado'
        currentValue?: number
      },
      overrideAccess: true,
    })

    await createAuditLog('objectives', String(id), 'editar', 'Objetivo actualizado')

    return { success: true, data: result }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function addObjectiveProgress({
  objectiveId,
  value,
  comment,
}: {
  objectiveId: string
  value: number
  comment?: string
}): ActionResult {
  try {
    const payload = await getPayload({ config })

    const userResult = await getCurrentUser()
    const userId =
      userResult.success && userResult.data
        ? String((userResult.data as { id: string | number }).id)
        : undefined

    // objective-progress is a new collection from FEAT-001; use 'as any' because
    // payload-types.ts is stale (FIGMA_EID not available to regenerate it).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = payload as any
    const progress = await p.create({
      collection: 'objective-progress',
      data: {
        objective: objectiveId,
        value,
        comment,
        date: new Date().toISOString(),
        user: userId,
      },
      overrideAccess: true,
    })

    await payload.update({
      collection: 'objectives',
      id: objectiveId,
      data: { currentValue: value },
      overrideAccess: true,
    })

    await createAuditLog(
      'objective-progress',
      String(progress.id),
      'crear',
      `Progreso registrado: ${value}`,
    )

    return { success: true, data: progress }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Audits (RN-08)
// ---------------------------------------------------------------------------

export async function getAudits(orgId: string): ActionResult {
  try {
    if (!(await validateOrgAccess(orgId))) return { success: false, error: 'Acceso denegado' }
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'audits',
      where: { organization: { equals: Number(orgId) } },
      overrideAccess: false,
      limit: 500,
    })
    return { success: true, data: result.docs }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function createAudit(data: Record<string, unknown>): ActionResult {
  try {
    const orgId = data.organization as string | number
    if (!(await validateOrgAccess(orgId))) return { success: false, error: 'Acceso denegado' }
    const payload = await getPayload({ config })
    const result = await payload.create({
      collection: 'audits',
      data: data as {
        organization: string
        area: string
        scope: string
        criteria: string
        date: string
        auditor: string
        status: 'Programada' | 'Reprogramada' | 'En ejecución' | 'Cerrada'
        findings?: Array<{
          description: string
          criteria: string
          criticality: 'Normal' | 'Crítica'
          isNonConformity?: boolean
          evidenceUrl?: string
        }>
      },
      overrideAccess: false,
    })

    await createAuditLog(
      'audits',
      String(result.id),
      'crear',
      `Auditoría creada: ${result.area}`,
      data.organization as string | undefined,
    )

    return { success: true, data: result }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function updateAudit(id: string, data: Record<string, unknown>): ActionResult {
  try {
    const payload = await getPayload({ config })

    const result = await payload.update({
      collection: 'audits',
      id,
      data: data as {
        area?: string
        scope?: string
        criteria?: string
        date?: string
        auditor?: string
        status?: 'Programada' | 'Reprogramada' | 'En ejecución' | 'Cerrada'
        findings?: Array<{
          description: string
          criteria: string
          criticality: 'Normal' | 'Crítica'
          isNonConformity?: boolean
          evidenceUrl?: string
        }>
      },
      overrideAccess: true,
    })

    // RN-08: auto-create NonConformities for findings where isNonConformity===true
    const findings = data.findings as
      | Array<{
          description?: string
          criteria?: string
          criticality?: 'Normal' | 'Crítica'
          isNonConformity?: boolean
          evidenceUrl?: string
        }>
      | undefined

    if (findings && findings.length > 0) {
      // Fetch the updated doc to get the organization
      const updatedDoc = await payload.findByID({
        collection: 'audits',
        id,
        overrideAccess: true,
      })

      const orgId =
        typeof updatedDoc.organization === 'object' && updatedDoc.organization !== null
          ? (updatedDoc.organization as { id: string | number }).id
          : updatedDoc.organization

      for (const finding of findings) {
        if (!finding.isNonConformity) continue

        const isCritical = finding.criticality === 'Crítica'
        const status = isCritical ? 'Escalada' : 'Detectada'
        const ncCode = `NC-AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

        try {
          const nc = await payload.create({
            collection: 'non-conformities',
            data: {
              organization: toId(orgId),
              code: ncCode,
              description: finding.description ?? 'No conformidad desde hallazgo de auditoría',
              origin: 'Auditoría',
              criticality: finding.criticality ?? 'Normal',
              status,
              audit: toId(id),
            } as unknown as Parameters<typeof payload.create<'non-conformities'>>[0]['data'],
            overrideAccess: true,
          })

          // RN-08: notify senior_management for Crítica findings
          if (isCritical) {
            try {
              const smUsers = await payload.find({
                collection: 'users',
                where: {
                  organization: { equals: toId(orgId) },
                  role: { equals: 'senior_management' },
                },
                overrideAccess: false,
                limit: 50,
              })

              for (const smUser of smUsers.docs) {
                await createNotification({
                  userId: smUser.id,
                  type: 'critical-non-conformity',
                  message: `Se ha detectado una no conformidad crítica (${ncCode}) en la auditoría. Se requiere atención inmediata.`,
                  reference: String(nc.id),
                })
              }
            } catch {
              // swallow
            }
          }
        } catch {
          // swallow individual NC creation errors
        }
      }

      await createAuditLog(
        'audits',
        String(id),
        'editar',
        'Auditoría actualizada',
        orgId,
      )
    } else {
      await createAuditLog('audits', String(id), 'editar', 'Auditoría actualizada')
    }

    return { success: true, data: result }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Non-Conformities
// ---------------------------------------------------------------------------

export async function getNonConformities(orgId: string): ActionResult {
  try {
    if (!(await validateOrgAccess(orgId))) return { success: false, error: 'Acceso denegado' }
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'non-conformities',
      where: { organization: { equals: Number(orgId) } },
      overrideAccess: false,
      limit: 500,
    })
    return { success: true, data: result.docs }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function createNonConformity(data: Record<string, unknown>): ActionResult {
  try {
    const payload = await getPayload({ config })
    const result = await payload.create({
      collection: 'non-conformities',
      data: data as {
        organization: string
        code: string
        description: string
        origin: 'Auditoría' | 'Requisito legal'
        criticality: 'Normal' | 'Crítica'
        status: 'Detectada' | 'Escalada' | 'En análisis' | 'En ejecución' | 'Vencida' | 'En verificación' | 'Cerrada'
        rootCause?: string
        deadline?: string
        owner?: string
        audit?: string
        legalRequirement?: string
      },
      overrideAccess: true,
    })

    await createAuditLog(
      'non-conformities',
      String(result.id),
      'crear',
      `No conformidad creada: ${result.code}`,
      data.organization as string | undefined,
    )

    return { success: true, data: result }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function updateNonConformity(
  id: string,
  data: Record<string, unknown>,
): ActionResult {
  try {
    const payload = await getPayload({ config })
    const result = await payload.update({
      collection: 'non-conformities',
      id,
      data: data as {
        code?: string
        description?: string
        origin?: 'Auditoría' | 'Requisito legal'
        criticality?: 'Normal' | 'Crítica'
        status?: 'Detectada' | 'Escalada' | 'En análisis' | 'En ejecución' | 'Vencida' | 'En verificación' | 'Cerrada'
        rootCause?: string
        deadline?: string
        owner?: string
        closedAt?: string
        correctiveAction?: {
          description?: string
          responsible?: string
          resources?: string
          deadline?: string
          effective?: 'true' | 'false' | ''
        }
      },
      overrideAccess: true,
    })

    await createAuditLog('non-conformities', String(id), 'editar', 'No conformidad actualizada')

    return { success: true, data: result }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------

export async function getIncidents(orgId: string): ActionResult {
  try {
    if (!(await validateOrgAccess(orgId))) return { success: false, error: 'Acceso denegado' }
    // incidents is a new collection from FEAT-001; use 'as any' for the same reason
    // as audit-log and objective-progress above.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (await getPayload({ config })) as any
    const result = await payload.find({
      collection: 'incidents',
      where: { organization: { equals: Number(orgId) } },
      overrideAccess: false,
      limit: 500,
    })
    return { success: true, data: result.docs }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function createIncident(data: Record<string, unknown>): ActionResult {
  try {
    const orgId = data.organization as string | number
    if (!(await validateOrgAccess(orgId))) return { success: false, error: 'Acceso denegado' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (await getPayload({ config })) as any
    const result = await payload.create({
      collection: 'incidents',
      data,
      overrideAccess: false,
    })

    await createAuditLog(
      'incidents',
      String(result.id),
      'crear',
      'Incidente creado',
      data.organization as string | undefined,
    )

    return { success: true, data: result }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Trainings
// ---------------------------------------------------------------------------

export async function getTrainings(orgId: string): ActionResult {
  try {
    if (!(await validateOrgAccess(orgId))) return { success: false, error: 'Acceso denegado' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (await getPayload({ config })) as any
    const result = await payload.find({
      collection: 'trainings',
      where: { organization: { equals: Number(orgId) } },
      overrideAccess: false,
      limit: 500,
    })
    return { success: true, data: result.docs }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function createTraining(data: Record<string, unknown>): ActionResult {
  try {
    const orgId = data.organization as string | number
    if (!(await validateOrgAccess(orgId))) return { success: false, error: 'Acceso denegado' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (await getPayload({ config })) as any
    const result = await payload.create({
      collection: 'trainings',
      data,
      overrideAccess: false,
    })

    await createAuditLog(
      'trainings',
      String(result.id),
      'crear',
      `Capacitación creada`,
      data.organization as string | undefined,
    )

    return { success: true, data: result }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Evidences
// ---------------------------------------------------------------------------

export async function getEvidences(orgId: string): ActionResult {
  try {
    if (!(await validateOrgAccess(orgId))) return { success: false, error: 'Acceso denegado' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (await getPayload({ config })) as any
    const result = await payload.find({
      collection: 'evidences',
      where: { organization: { equals: Number(orgId) } },
      overrideAccess: false,
      limit: 500,
    })
    return { success: true, data: result.docs }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function createEvidence(data: Record<string, unknown>): ActionResult {
  try {
    const orgId = data.organization as string | number
    if (!(await validateOrgAccess(orgId))) return { success: false, error: 'Acceso denegado' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (await getPayload({ config })) as any
    const result = await payload.create({
      collection: 'evidences',
      data,
      overrideAccess: false,
    })

    await createAuditLog(
      'evidences',
      String(result.id),
      'crear',
      `Evidencia creada`,
      data.organization as string | undefined,
    )

    return { success: true, data: result }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function getNotifications(userId: string): ActionResult {
  try {
    // Verificar que el usuario autenticado solo puede ver sus propias notificaciones
    const userResult = await getCurrentUser()
    if (!userResult.success || !userResult.data)
      return { success: false, error: 'No autenticado' }
    const authUser = userResult.data as { id?: string | number }
    if (Number(authUser.id) !== Number(userId))
      return { success: false, error: 'Acceso denegado' }

    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'notifications',
      where: { user: { equals: Number(userId) } },
      overrideAccess: true,
      sort: '-createdAt',
      limit: 200,
    })
    return { success: true, data: result.docs }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function markNotificationRead(id: string): ActionResult {
  try {
    const payload = await getPayload({ config })
    const result = await payload.update({
      collection: 'notifications',
      id,
      data: { read: true },
      overrideAccess: true,
    })
    return { success: true, data: result }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Objective detail actions
// ---------------------------------------------------------------------------

export async function getObjectiveById(id: string): ActionResult {
  try {
    const payload = await getPayload({ config })
    const result = await payload.findByID({
      collection: 'objectives',
      id: Number(id),
      overrideAccess: true,
      depth: 2,
    })
    return { success: true, data: result }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getObjectiveProgress(objectiveId: string): ActionResult {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'objective-progress',
      where: { objective: { equals: Number(objectiveId) } },
      overrideAccess: true,
      sort: '-date',
      limit: 100,
      depth: 1,
    })
    return { success: true, data: result.docs }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Non-conformity detail actions
// ---------------------------------------------------------------------------

export async function getNonConformityById(id: string): ActionResult {
  try {
    const payload = await getPayload({ config })
    const result = await payload.findByID({
      collection: 'non-conformities',
      id: Number(id),
      overrideAccess: true,
      depth: 2,
    })
    return { success: true, data: result }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getAuditLogForRecord(table: string, recordId: string): ActionResult {
  try {
    const payload = await getPayload({ config })
    const p = payload as any
    const result = await p.find({
      collection: 'audit-log',
      where: {
        AND: [
          { table: { equals: table } },
          { recordId: { equals: recordId } },
        ],
      },
      overrideAccess: true,
      sort: 'date',
      limit: 100,
      depth: 1,
    })
    return { success: true, data: result.docs }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Aspect detail
// ---------------------------------------------------------------------------

export async function getAspectById(id: string): ActionResult {
  try {
    const payload = await getPayload({ config })
    const p = payload as any
    const result = await p.findByID({
      collection: 'aspects',
      id: Number(id),
      overrideAccess: true,
      depth: 2,
    })
    return { success: true, data: result }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Audit detail & findings
// ---------------------------------------------------------------------------

export async function getAuditById(id: string): ActionResult {
  try {
    const payload = await getPayload({ config })
    const result = await payload.findByID({
      collection: 'audits',
      id: Number(id),
      overrideAccess: true,
      depth: 2,
    })
    return { success: true, data: result }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function addFindingToAudit(
  auditId: string,
  finding: {
    description: string
    criteria: string
    criticality: 'Normal' | 'Crítica'
    isNonConformity: boolean
    evidenceUrl?: string
  },
): ActionResult {
  try {
    const payload = await getPayload({ config })
    // Get current audit to append finding
    const existing = await payload.findByID({
      collection: 'audits',
      id: Number(auditId),
      overrideAccess: true,
    }) as any
    const currentFindings = existing.findings ?? []
    const updated = await payload.update({
      collection: 'audits',
      id: Number(auditId),
      data: {
        findings: [
          ...currentFindings,
          {
            description: finding.description,
            criteria: finding.criteria,
            criticality: finding.criticality,
            isNonConformity: finding.isNonConformity,
            evidenceUrl: finding.evidenceUrl ?? '',
          },
        ],
      },
      overrideAccess: true,
    })
    // If it's a NC, create non-conformity automatically (RN-08)
    if (finding.isNonConformity) {
      const org = (existing as any).organization
      const orgId = typeof org === 'object' ? org?.id : org
      const status = finding.criticality === 'Crítica' ? 'Escalada' : 'Detectada'
      await payload.create({
        collection: 'non-conformities',
        data: {
          organization: Number(orgId),
          code: `NC-AUD-${Date.now()}`,
          description: finding.description,
          origin: 'Auditoría',
          criticality: finding.criticality,
          status,
          audit: Number(auditId),
        } as any,
        overrideAccess: true,
      })
    }
    await createAuditLog('audits', auditId, 'editar', `Hallazgo agregado: ${finding.description}`)
    return { success: true, data: updated }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Evidences — review (Resp. Ambiental approves/rejects)
// ---------------------------------------------------------------------------

export async function reviewEvidence(
  id: string,
  status: 'Aprobada' | 'Rechazada',
): ActionResult {
  try {
    const payload = await getPayload({ config })
    const result = await payload.update({
      collection: 'evidences',
      id: Number(id),
      data: { statusReview: status } as any,
      overrideAccess: true,
    })
    return { success: true, data: result }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// Trainings filtered by attendee (for collaborator role)
export async function getMyTrainings(orgId: string, userId: string): ActionResult {
  try {
    if (!(await validateOrgAccess(orgId))) return { success: false, error: 'Acceso denegado' }
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'trainings',
      where: {
        AND: [
          { organization: { equals: Number(orgId) } },
          { attendee: { equals: Number(userId) } },
        ],
      },
      overrideAccess: true,
      limit: 500,
    })
    return { success: true, data: result.docs }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// Evidences filtered by uploader (for supplier role)
export async function getMyEvidences(orgId: string, userId: string): ActionResult {
  try {
    if (!(await validateOrgAccess(orgId))) return { success: false, error: 'Acceso denegado' }
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'evidences',
      where: {
        AND: [
          { organization: { equals: Number(orgId) } },
          { uploadedBy: { equals: Number(userId) } },
        ],
      },
      overrideAccess: true,
      limit: 500,
    })
    return { success: true, data: result.docs }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Parameters (org settings)
// ---------------------------------------------------------------------------

export async function getParameters(orgId: string): ActionResult {
  try {
    if (!(await validateOrgAccess(orgId))) return { success: false, error: 'Acceso denegado' }
    const payload = await getPayload({ config })
    const p = payload as any
    const result = await p.find({
      collection: 'parametros',
      where: { organization: { equals: Number(orgId) } },
      overrideAccess: true,
      limit: 1,
    })
    return { success: true, data: result.docs[0] ?? null }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

export async function saveParameters(
  orgId: string,
  data: { umbralAlta: number; umbralMedia: number; diasAlerta: number[] },
): ActionResult {
  try {
    if (!(await validateOrgAccess(orgId))) return { success: false, error: 'Acceso denegado' }
    const payload = await getPayload({ config })
    const p = payload as any
    // Find existing or create
    const existing = await p.find({
      collection: 'parametros',
      where: { organization: { equals: Number(orgId) } },
      overrideAccess: true,
      limit: 1,
    })
    if (existing.docs[0]) {
      const updated = await p.update({
        collection: 'parametros',
        id: existing.docs[0].id,
        data: {
          umbral_alta: data.umbralAlta,
          umbral_media: data.umbralMedia,
          dias_alerta: data.diasAlerta,
        },
        overrideAccess: true,
      })
      return { success: true, data: updated }
    } else {
      const created = await p.create({
        collection: 'parametros',
        data: {
          organization: Number(orgId),
          umbral_alta: data.umbralAlta,
          umbral_media: data.umbralMedia,
          dias_alerta: data.diasAlerta,
        },
        overrideAccess: true,
      })
      return { success: true, data: created }
    }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Auto-transitions: RN-07, RN-10, RN-03 (call on dashboard load)
// ---------------------------------------------------------------------------

export async function checkAndApplyAutoTransitions(orgId: string): ActionResult {
  try {
    const payload = await getPayload({ config })
    const now = new Date()

    // ── RN-07: Objetivo Activo con deadline pasado y sin meta → Desviado ──
    const objRes = await payload.find({
      collection: 'objectives',
      where: {
        AND: [
          { organization: { equals: Number(orgId) } },
          { status: { equals: 'Activo' } },
        ],
      },
      overrideAccess: true,
      limit: 500,
    })

    for (const obj of objRes.docs) {
      const o = obj as any
      if (!o.deadline) continue
      const deadlinePassed = new Date(o.deadline) < now
      const notReached = (o.currentValue ?? 0) < (o.target ?? 0)
      if (!deadlinePassed || !notReached) continue

      await payload.update({
        collection: 'objectives',
        id: o.id,
        data: { status: 'Desviado' } as any,
        overrideAccess: true,
      })

      const ownerId = typeof o.owner === 'object' && o.owner !== null ? o.owner?.id : o.owner
      if (ownerId) {
        await createNotification({
          userId: ownerId,
          type: 'objective-deviated',
          message: `El objetivo "${o.title ?? ''}" venció sin alcanzar la meta y pasó a Desviado.`,
          reference: String(o.id),
        })
      }

      const smUsers = await payload.find({
        collection: 'users',
        where: { AND: [{ organization: { equals: Number(orgId) } }, { role: { equals: 'senior_management' } }] },
        overrideAccess: true,
        limit: 50,
      })
      for (const sm of smUsers.docs) {
        await createNotification({
          userId: sm.id,
          type: 'objective-deviated',
          message: `El objetivo "${o.title ?? ''}" fue marcado automáticamente como Desviado.`,
          reference: String(o.id),
        })
      }

      await createAuditLog('objectives', String(o.id), 'cambio_estado', 'Auto: Desviado por vencimiento (RN-07)', orgId)
    }

    // ── RN-10: NC En ejecución con plazo correctivo vencido → Vencida ──
    const ncRes = await payload.find({
      collection: 'non-conformities',
      where: {
        AND: [
          { organization: { equals: Number(orgId) } },
          { status: { equals: 'En ejecución' } },
        ],
      },
      overrideAccess: true,
      limit: 500,
    })

    for (const nc of ncRes.docs) {
      const n = nc as any
      const caDeadline = n.correctiveAction?.deadline
      if (!caDeadline || new Date(caDeadline) >= now) continue

      await payload.update({
        collection: 'non-conformities',
        id: n.id,
        data: { status: 'Vencida' } as any,
        overrideAccess: true,
      })

      const respRaw = n.correctiveAction?.responsible
      const respId = typeof respRaw === 'object' && respRaw !== null ? respRaw?.id : respRaw
      if (respId) {
        await createNotification({
          userId: respId,
          type: 'nc-expired',
          message: `El plazo de la acción correctiva de la NC "${n.code ?? ''}" venció. Estado: Vencida.`,
          reference: String(n.id),
        })
      }

      const smUsers2 = await payload.find({
        collection: 'users',
        where: { AND: [{ organization: { equals: Number(orgId) } }, { role: { equals: 'senior_management' } }] },
        overrideAccess: true,
        limit: 50,
      })
      for (const sm of smUsers2.docs) {
        await createNotification({
          userId: sm.id,
          type: 'nc-expired',
          message: `La NC "${n.code ?? ''}" pasó a Vencida por plazo correctivo vencido.`,
          reference: String(n.id),
        })
      }

      await createAuditLog('non-conformities', String(n.id), 'cambio_estado', 'Auto: Vencida por plazo correctivo (RN-10)', orgId)
    }

    // ── RN-03: Requisitos legales por vencer — sin duplicados (24h) ──
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const in30 = new Date(today)
    in30.setDate(in30.getDate() + 30)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const lrRes = await payload.find({
      collection: 'legal-requirements',
      where: {
        AND: [
          { organization: { equals: Number(orgId) } },
          { nextReview: { greater_than_equal: today.toISOString() } },
          { nextReview: { less_than_equal: in30.toISOString() } },
        ],
      },
      overrideAccess: true,
      limit: 500,
    })

    const emUsers = await payload.find({
      collection: 'users',
      where: { AND: [{ organization: { equals: Number(orgId) } }, { role: { equals: 'environmental_manager' } }] },
      overrideAccess: true,
      limit: 50,
    })

    for (const lr of lrRes.docs) {
      const lrDoc = lr as any

      // Dedup: check if already notified in last 24h
      const existing = await payload.find({
        collection: 'notifications',
        where: {
          AND: [
            { type: { equals: 'legal-expiry' } },
            { reference: { equals: String(lrDoc.id) } },
            { createdAt: { greater_than: oneDayAgo.toISOString() } },
          ],
        },
        overrideAccess: true,
        limit: 1,
      })
      if (existing.docs.length > 0) continue

      const daysLeft = Math.ceil(
        (new Date(lrDoc.nextReview).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      )
      const message = `Vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''} la revisión del requisito "${lrDoc.title ?? ''}".`

      const respRaw = lrDoc.responsible
      const respId = typeof respRaw === 'object' && respRaw !== null ? respRaw?.id : respRaw
      const targetIds: Array<string | number> = respId
        ? [respId]
        : emUsers.docs.map((u: any) => u.id)

      for (const uid of targetIds) {
        await createNotification({ userId: uid, type: 'legal-expiry', message, reference: String(lrDoc.id) })
      }
    }

    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Invite user (admin creates additional users within their org)
// ---------------------------------------------------------------------------

export async function inviteUser({
  orgId,
  name,
  email,
  password,
  role,
}: {
  orgId: string
  name: string
  email: string
  password: string
  role: string
}): ActionResult {
  // Only non-privileged roles can be assigned via invitation
  const RESTRICTED = ['administrator', 'senior_management']
  const safeRole = RESTRICTED.includes(role) ? 'collaborator' : role

  if (!name?.trim() || name.trim().length < 2)
    return { success: false, error: 'Nombre inválido (mínimo 2 caracteres)' }
  if (!email?.includes('@') || email.length < 5)
    return { success: false, error: 'Correo electrónico inválido' }
  if (!password || password.length < 8)
    return { success: false, error: 'La contraseña debe tener al menos 8 caracteres' }

  try {
    const payload = await getPayload({ config })

    // Verify the caller owns this org
    if (!(await validateOrgAccess(orgId))) return { success: false, error: 'Acceso denegado' }

    const user = await payload.create({
      collection: 'users',
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: safeRole as 'collaborator',
        organization: Number(orgId),
        active: true,
      },
      overrideAccess: true,
    })

    await createAuditLog('users', String(user.id), 'crear', `Usuario invitado: ${name} (${safeRole})`, orgId)
    return { success: true, data: user }
  } catch (e: unknown) {
    const msg = (e as Error).message ?? ''
    if (/unique|email/i.test(msg)) {
      return { success: false, error: 'Este correo ya está registrado en la plataforma.' }
    }
    return { success: false, error: msg }
  }
}
