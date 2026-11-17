import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'

// Ruta temporal de diagnóstico — ELIMINAR después
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const orgId = url.searchParams.get('orgId') ?? '2'

    const payload = await getPayload({ config })

    // Verificar sesión actual
    const cs = await cookies()
    const headers = new Headers({ cookie: cs.toString() })
    const { user: sessionUser } = await payload.auth({ headers })

    const aspects = await payload.find({
      collection: 'aspects',
      where: { organization: { equals: Number(orgId) } },
      overrideAccess: true,
      limit: 5,
    })

    const objectives = await payload.find({
      collection: 'objectives',
      where: { organization: { equals: Number(orgId) } },
      overrideAccess: true,
      limit: 5,
    })

    const ncs = await payload.find({
      collection: 'non-conformities',
      where: { organization: { equals: Number(orgId) } },
      overrideAccess: true,
      limit: 5,
    })

    // Si hay sesión, mostrar su org
    let sessionInfo = null
    if (sessionUser) {
      const fullUser = await payload.findByID({
        collection: 'users',
        id: (sessionUser as any).id,
        overrideAccess: true,
        depth: 2,
      }) as any
      sessionInfo = {
        id: fullUser.id,
        email: fullUser.email,
        role: fullUser.role,
        organization: fullUser.organization,
        orgType: typeof fullUser.organization,
      }
    }

    return NextResponse.json({
      sessionUser: sessionInfo,
      queriedOrgId: Number(orgId),
      aspects: { total: aspects.totalDocs, docs: aspects.docs.map((d: any) => ({ id: d.id, name: d.name, level: d.level })) },
      objectives: { total: objectives.totalDocs },
      ncs: { total: ncs.totalDocs },
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
