import type { Access, CollectionConfig, Field } from 'payload'

const isAdmin: Access = ({ req }) => req.user?.collection === 'admins'
const isAppUser: Access = ({ req }) => req.user?.collection === 'users'

const organizationField: Field = {
  name: 'organization',
  type: 'relationship',
  relationTo: 'organizations',
  required: true,
  index: true,
}

const appAccess = {
  create: isAppUser,
  delete: isAppUser,
  read: isAppUser,
  update: isAppUser,
}

export const Organizations: CollectionConfig = {
  slug: 'organizations',
  admin: { group: 'EcoCert 360', useAsTitle: 'name' },
  access: {
    create: () => true,
    delete: isAdmin,
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) =>
      req.user?.collection === 'admins' || req.user?.collection === 'users',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'nit', type: 'text', required: true, unique: true },
    { name: 'sector', type: 'text', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: '⏳ Pendiente de aprobación', value: 'pending' },
        { label: '✅ Activa', value: 'active' },
        { label: '🚫 Suspendida', value: 'suspended' },
      ],
      admin: {
        description: 'Solo un administrador puede activar o suspender una organización.',
      },
      // Solo admins del panel pueden cambiar el estado
      access: {
        create: () => false,          // siempre nace como 'pending' (defaultValue)
        update: ({ req }: { req: { user?: { collection?: string } | null } }) =>
          req.user?.collection === 'admins',
      },
    },
    {
      name: 'requestedAt',
      type: 'date',
      admin: { readOnly: true, description: 'Fecha en que se envió la solicitud de registro.' },
    },
    {
      name: 'approvedAt',
      type: 'date',
      admin: { readOnly: true, description: 'Fecha en que fue aprobada.' },
    },
  ],
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: { group: 'EcoCert 360', useAsTitle: 'name' },
  auth: true,
  access: {
    create: () => true,
    delete: isAdmin,
    read: ({ req }) => req.user?.collection === 'users' || req.user?.collection === 'admins',
    update: ({ req }) => req.user?.collection === 'users' || req.user?.collection === 'admins',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    organizationField,
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'collaborator',
      options: [
        { label: 'Administrador', value: 'administrator' },
        { label: 'Alta dirección', value: 'senior_management' },
        { label: 'Responsable ambiental', value: 'environmental_manager' },
        { label: 'Auditor', value: 'auditor' },
        { label: 'Colaborador', value: 'collaborator' },
        { label: 'Proveedor', value: 'supplier' },
      ],
      access: {
        // Bloquea asignación de roles privilegiados al crear desde la API pública
        create: ({ data }: { data?: Record<string, unknown> }) => {
          const restricted = ['administrator', 'senior_management']
          return !restricted.includes(data?.role as string)
        },
        // Solo admins del panel CMS pueden cambiar el rol de un usuario
        update: ({ req }: { req: { user?: { collection?: string } | null } }) =>
          req.user?.collection === 'admins',
      },
    },
    { name: 'active', type: 'checkbox', defaultValue: true },
    { name: 'responsible', type: 'relationship', relationTo: 'users' },
  ],
}

export const Aspects: CollectionConfig = {
  slug: 'aspects',
  admin: { group: 'Gestión ambiental', useAsTitle: 'name' },
  access: appAccess,
  fields: [
    organizationField,
    { name: 'activity', type: 'text', required: true },
    { name: 'name', type: 'text', required: true },
    { name: 'impact', type: 'textarea', required: true },
    { name: 'severity', type: 'number', min: 1, max: 5 },
    { name: 'frequency', type: 'number', min: 1, max: 5 },
    { name: 'scope', type: 'number', min: 1, max: 5 },
    { name: 'significance', type: 'number', admin: { readOnly: true } },
    {
      name: 'level',
      type: 'select',
      required: true,
      options: ['Alta', 'Media', 'Baja', 'Pendiente'],
    },
    { name: 'createdBy', type: 'relationship', relationTo: 'users' },
  ],
}

export const LegalRequirements: CollectionConfig = {
  slug: 'legal-requirements',
  admin: { group: 'Gestión ambiental', useAsTitle: 'title' },
  access: appAccess,
  fields: [
    organizationField,
    { name: 'title', type: 'text', required: true },
    { name: 'issuer', type: 'text', required: true },
    { name: 'aspect', type: 'relationship', relationTo: 'aspects' },
    { name: 'nextReview', type: 'date', required: true },
    {
      name: 'compliance',
      type: 'select',
      required: true,
      options: ['Cumple', 'No cumple', 'Sin evaluar'],
    },
    { name: 'responsible', type: 'relationship', relationTo: 'users' },
  ],
}

export const Objectives: CollectionConfig = {
  slug: 'objectives',
  admin: { group: 'Gestión ambiental', useAsTitle: 'title' },
  access: appAccess,
  fields: [
    organizationField,
    { name: 'title', type: 'text', required: true },
    { name: 'indicator', type: 'text', required: true },
    { name: 'target', type: 'number', required: true },
    { name: 'currentValue', type: 'number', defaultValue: 0 },
    { name: 'unit', type: 'text', required: true },
    { name: 'deadline', type: 'date', required: true },
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: ['Borrador', 'En aprobación', 'Activo', 'Desviado', 'Cumplido', 'Cancelado'],
    },
    {
      name: 'actions',
      type: 'array',
      fields: [
        { name: 'description', type: 'text', required: true },
        { name: 'resources', type: 'text', required: true },
        { name: 'deadline', type: 'date', required: true },
        { name: 'completed', type: 'checkbox', defaultValue: false },
        { name: 'responsible', type: 'relationship', relationTo: 'users', required: true },
      ],
    },
  ],
}

export const Audits: CollectionConfig = {
  slug: 'audits',
  admin: { group: 'Evaluación', useAsTitle: 'area' },
  access: appAccess,
  fields: [
    organizationField,
    { name: 'area', type: 'text', required: true },
    { name: 'scope', type: 'textarea', required: true },
    { name: 'criteria', type: 'textarea', required: true },
    { name: 'date', type: 'date', required: true },
    { name: 'auditor', type: 'relationship', relationTo: 'users', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: ['Programada', 'Reprogramada', 'En ejecución', 'Cerrada'],
    },
    {
      name: 'findings',
      type: 'array',
      fields: [
        { name: 'description', type: 'text', required: true },
        { name: 'criteria', type: 'text', required: true },
        {
          name: 'criticality',
          type: 'select',
          required: true,
          options: ['Normal', 'Crítica'],
        },
        { name: 'isNonConformity', type: 'checkbox', defaultValue: false },
        { name: 'evidenceUrl', type: 'text' },
      ],
    },
  ],
}

export const NonConformities: CollectionConfig = {
  slug: 'non-conformities',
  admin: { group: 'Evaluación', useAsTitle: 'code' },
  access: appAccess,
  fields: [
    organizationField,
    { name: 'code', type: 'text', required: true, unique: true },
    { name: 'description', type: 'textarea', required: true },
    { name: 'origin', type: 'select', required: true, options: ['Auditoría', 'Requisito legal'] },
    { name: 'criticality', type: 'select', required: true, options: ['Normal', 'Crítica'] },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        'Detectada',
        'Escalada',
        'En análisis',
        'En ejecución',
        'Vencida',
        'En verificación',
        'Cerrada',
      ],
    },
    { name: 'rootCause', type: 'textarea' },
    { name: 'deadline', type: 'date' },
    { name: 'owner', type: 'relationship', relationTo: 'users' },
    { name: 'audit', type: 'relationship', relationTo: 'audits' },
    { name: 'legalRequirement', type: 'relationship', relationTo: 'legal-requirements' },
    {
      name: 'correctiveAction',
      type: 'group',
      fields: [
        { name: 'description', type: 'text' },
        { name: 'responsible', type: 'relationship', relationTo: 'users' },
        { name: 'resources', type: 'text' },
        { name: 'deadline', type: 'date' },
        {
          name: 'effective',
          type: 'select',
          options: [
            { label: 'Verdadero', value: 'true' },
            { label: 'Falso', value: 'false' },
            { label: 'Vacío', value: '' },
          ],
        },
      ],
    },
    { name: 'closedAt', type: 'date' },
  ],
}

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  admin: { group: 'EcoCert 360', useAsTitle: 'message' },
  access: appAccess,
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'message', type: 'text', required: true },
    { name: 'type', type: 'text', required: true },
    { name: 'read', type: 'checkbox', defaultValue: false },
    { name: 'reference', type: 'text' },
  ],
}

export const ObjectiveProgress: CollectionConfig = {
  slug: 'objective-progress',
  admin: { group: 'Gestión ambiental' },
  access: appAccess,
  fields: [
    { name: 'objective', type: 'relationship', relationTo: 'objectives', required: true },
    { name: 'value', type: 'number', required: true },
    { name: 'comment', type: 'text' },
    { name: 'date', type: 'date', required: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
  ],
}

export const Incidents: CollectionConfig = {
  slug: 'incidents',
  admin: { group: 'Gestión ambiental' },
  access: appAccess,
  fields: [
    organizationField,
    {
      name: 'type',
      type: 'select',
      required: true,
      options: ['incidente', 'emergencia'],
    },
    { name: 'description', type: 'textarea', required: true },
    { name: 'date', type: 'date', required: true },
    { name: 'location', type: 'text' },
    {
      name: 'severity',
      type: 'select',
      required: true,
      options: ['Baja', 'Media', 'Alta'],
    },
    { name: 'responsePlan', type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: ['Abierto', 'En seguimiento', 'Cerrado'],
    },
    { name: 'reportedBy', type: 'relationship', relationTo: 'users' },
  ],
}

export const Trainings: CollectionConfig = {
  slug: 'trainings',
  admin: { group: 'Gestión ambiental' },
  access: appAccess,
  fields: [
    organizationField,
    { name: 'topic', type: 'text', required: true },
    { name: 'date', type: 'date', required: true },
    { name: 'attendee', type: 'relationship', relationTo: 'users' },
    { name: 'result', type: 'number', min: 0, max: 100 },
    {
      name: 'competent',
      type: 'select',
      options: ['Sí', 'No'],
    },
  ],
}

export const Evidences: CollectionConfig = {
  slug: 'evidences',
  admin: { group: 'Gestión ambiental' },
  access: appAccess,
  fields: [
    organizationField,
    { name: 'sourceTable', type: 'text' },
    { name: 'recordId', type: 'text' },
    { name: 'description', type: 'text', required: true },
    {
      name: 'statusReview',
      type: 'select',
      required: true,
      options: ['Pendiente', 'Aprobada', 'Rechazada'],
    },
    { name: 'uploadedBy', type: 'relationship', relationTo: 'users' },
    { name: 'file', type: 'upload', relationTo: 'media' },
  ],
}

export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  admin: { group: 'EcoCert 360' },
  access: appAccess,
  fields: [
    organizationField,
    { name: 'user', type: 'relationship', relationTo: 'users' },
    { name: 'table', type: 'text', required: true },
    { name: 'recordId', type: 'text', required: true },
    {
      name: 'action',
      type: 'select',
      required: true,
      options: ['crear', 'editar', 'cambio_estado'],
    },
    { name: 'detail', type: 'text' },
    {
      name: 'date',
      type: 'date',
      defaultValue: () => new Date().toISOString(),
    },
  ],
}

export const ecoCertCollections = [
  Organizations,
  Users,
  Aspects,
  LegalRequirements,
  Objectives,
  Audits,
  NonConformities,
  Notifications,
  ObjectiveProgress,
  Incidents,
  Trainings,
  Evidences,
  AuditLog,
]
