import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// Ruta de uso único para crear el primer admin de Payload.
// ELIMINAR después de crear el admin.
export async function GET() {
  try {
    const payload = await getPayload({ config })

    // Verificar si ya existe algún admin
    const existing = await payload.find({
      collection: 'admins',
      limit: 1,
      overrideAccess: true,
    })

    if (existing.docs.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un administrador. Esta ruta está deshabilitada.' },
        { status: 403 },
      )
    }

    // Crear el admin
    const admin = await payload.create({
      collection: 'admins',
      data: {
        email: 'admin@ecocert360.co',
        password: 'Admin1234!',
      },
      overrideAccess: true,
    })

    return NextResponse.json({
      success: true,
      message: 'Admin creado. Ve a /admin y entra con estas credenciales:',
      email: 'admin@ecocert360.co',
      password: 'Admin1234!',
      warning: 'ELIMINA esta ruta después de hacer login.',
      adminId: admin.id,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
