import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// Ruta temporal de diagnóstico — ELIMINAR después
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const orgId = url.searchParams.get('orgId') ?? '2'

    const payload = await getPayload({ config })

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

    return NextResponse.json({
      orgId: Number(orgId),
      aspects: { total: aspects.totalDocs, docs: aspects.docs.map((d: any) => ({ id: d.id, name: d.name, level: d.level })) },
      objectives: { total: objectives.totalDocs, docs: objectives.docs.map((d: any) => ({ id: d.id, title: d.title, status: d.status })) },
      ncs: { total: ncs.totalDocs, docs: ncs.docs.map((d: any) => ({ id: d.id, code: d.code, status: d.status })) },
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
