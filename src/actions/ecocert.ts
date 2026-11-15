'use server'

import { getPayload } from 'payload'
import { cookies } from 'next/headers'
import config from '@/payload.config'

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
  try {
    const payload = await getPayload({ config })

    const org = await payload.create({
      collection: 'organizations',
      data: { name: orgName, nit, sector },
      overrideAccess: false,
    })

    await payload.create({
      collection: 'users',
      data: {
        name,
        email,
        password,
        role: (role ?? 'administrator') as 'administrator',
        organization: String(org.id),
        active: true,
      },
      overrideAccess: false,
    })

    return loginUser(email, password)
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
        user: String(userId),
        type,
        message,
        reference,
        read: false,
      },
      overrideAccess: false,
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
        organization: organizationId ? String(organizationId) : undefined,
        user: resolvedUserId ? String(resolvedUserId) : undefined,
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
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'users',
      where: { organization: { equals: orgId } },
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
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'aspects',
      where: { organization: { equals: orgId } },
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
        createdBy: data.createdBy ? String(data.createdBy) : undefined,
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
        overrideAccess: false,
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
      data: updateData as {
        severity?: number
        frequency?: number
        scope?: number
        significance?: number
        level?: 'Alta' | 'Media' | 'Baja' | 'Pendiente'
        organization?: string
        activity?: string
        name?: string
        impact?: string
      },
      overrideAccess: false,
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
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'legal-requirements',
      where: { organization: { equals: orgId } },
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
    const payload = await getPayload({ config })
    const result = await payload.create({
      collection: 'legal-requirements',
      data: data as {
        title: string
        issuer: string
        organization: string
        nextReview: string
        compliance: 'Cumple' | 'No cumple' | 'Sin evaluar'
        aspect?: string
        responsible?: string
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
      overrideAccess: false,
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
            organization: String(orgId),
            code: ncCode,
            description: `No conformidad generada automáticamente por cambio de cumplimiento en requisito legal: ${existing.title}`,
            origin: 'Requisito legal',
            criticality: 'Normal',
            status: 'Detectada',
            legalRequirement: id,
          } as {
            organization: string
            code: string
            description: string
            origin: 'Auditoría' | 'Requisito legal'
            criticality: 'Normal' | 'Crítica'
            status: 'Detectada' | 'Escalada' | 'En análisis' | 'En ejecución' | 'Vencida' | 'En verificación' | 'Cerrada'
            legalRequirement: string
          },
          overrideAccess: false,
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
      data: data as {
        title?: string
        issuer?: string
        organization?: string
        nextReview?: string
        compliance?: 'Cumple' | 'No cumple' | 'Sin evaluar'
        aspect?: string
        responsible?: string
      },
      overrideAccess: false,
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
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'objectives',
      where: { organization: { equals: orgId } },
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
      data: data as {
        title: string
        indicator: string
        target: number
        unit: string
        deadline: string
        owner: string
        status: 'Borrador' | 'En aprobación' | 'Activo' | 'Desviado' | 'Cumplido' | 'Cancelado'
        organization: string
        actions?: Array<{
          description: string
          resources: string
          deadline: string
          responsible: string
          completed?: boolean
        }>
        currentValue?: number
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
      overrideAccess: false,
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
      overrideAccess: false,
    })

    await payload.update({
      collection: 'objectives',
      id: objectiveId,
      data: { currentValue: value },
      overrideAccess: false,
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
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'audits',
      where: { organization: { equals: orgId } },
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
      overrideAccess: false,
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
        overrideAccess: false,
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
              organization: String(orgId),
              code: ncCode,
              description: finding.description ?? 'No conformidad desde hallazgo de auditoría',
              origin: 'Auditoría',
              criticality: finding.criticality ?? 'Normal',
              status,
              audit: id,
            } as {
              organization: string
              code: string
              description: string
              origin: 'Auditoría' | 'Requisito legal'
              criticality: 'Normal' | 'Crítica'
              status: 'Detectada' | 'Escalada' | 'En análisis' | 'En ejecución' | 'Vencida' | 'En verificación' | 'Cerrada'
              audit: string
            },
            overrideAccess: false,
          })

          // RN-08: notify senior_management for Crítica findings
          if (isCritical) {
            try {
              const smUsers = await payload.find({
                collection: 'users',
                where: {
                  organization: { equals: String(orgId) },
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
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'non-conformities',
      where: { organization: { equals: orgId } },
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
      overrideAccess: false,
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
      overrideAccess: false,
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
    // incidents is a new collection from FEAT-001; use 'as any' for the same reason
    // as audit-log and objective-progress above.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (await getPayload({ config })) as any
    const result = await payload.find({
      collection: 'incidents',
      where: { organization: { equals: orgId } },
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (await getPayload({ config })) as any
    const result = await payload.find({
      collection: 'trainings',
      where: { organization: { equals: orgId } },
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (await getPayload({ config })) as any
    const result = await payload.find({
      collection: 'evidences',
      where: { organization: { equals: orgId } },
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
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'notifications',
      where: { user: { equals: userId } },
      overrideAccess: false,
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
      overrideAccess: false,
    })
    return { success: true, data: result }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
}
