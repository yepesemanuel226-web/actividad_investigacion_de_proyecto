'use client'

import { useMemo, useState, useEffect, useCallback, useTransition, createContext, useContext } from 'react'
import {
  loginUser,
  registerUser,
  getCurrentUser,
  getAspects,
  createAspect,
  getLegalRequirements,
  createLegalRequirement,
  getObjectives,
  createObjective,
  getAudits,
  createAudit,
  getNonConformities,
  getIncidents,
  createIncident,
  getTrainings,
  createTraining,
  getEvidences,
  createEvidence,
  getNotifications,
  markNotificationRead,
  getUsers,
  createNotification,
} from '@/actions/ecocert'

// ---------------------------------------------------------------------------
// AppContext
// ---------------------------------------------------------------------------

type AppUser = {
  id: string
  name: string
  role: string
  email: string
  organization?: { id: string; name: string }
}

type AppCtx = {
  currentUser: AppUser | null
  organizationId: string | null
  setCurrentUser: (u: AppUser | null) => void
}

const AppContext = createContext<AppCtx>({
  currentUser: null,
  organizationId: null,
  setCurrentUser: () => {},
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const roleLabelMap: Record<string, string> = {
  administrator: 'Administrador',
  senior_management: 'Alta dirección',
  environmental_manager: 'Resp. ambiental',
  auditor: 'Auditor',
  collaborator: 'Colaborador',
  supplier: 'Proveedor',
}

function formatDate(isoString: string | undefined | null): string {
  if (!isoString) return '—'
  try {
    return new Date(isoString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ---------------------------------------------------------------------------
// Icon
// ---------------------------------------------------------------------------

type IconName =
  | 'grid'
  | 'leaf'
  | 'scale'
  | 'target'
  | 'clipboard'
  | 'alert'
  | 'training'
  | 'file'
  | 'chart'
  | 'users'
  | 'settings'
  | 'bell'
  | 'search'
  | 'plus'
  | 'arrow'
  | 'check'
  | 'calendar'
  | 'download'
  | 'menu'
  | 'close'
  | 'logout'

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    leaf: (
      <>
        <path d="M20 4c-7 0-13 3-13 9 0 3 2 5 5 5 6 0 8-7 8-14Z" />
        <path d="M4 21c2-6 6-9 12-12" />
      </>
    ),
    scale: (
      <>
        <path d="M12 3v18M5 6h14M5 6l-3 7h6L5 6Zm14 0-3 7h6l-3-7Z" />
        <path d="M2 13c1 2 5 2 6 0M16 13c1 2 5 2 6 0M8 21h8" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    clipboard: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4V2h6v2M8 10h8M8 14h5" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3 2.8 19h18.4L12 3Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    training: (
      <>
        <path d="m3 8 9-5 9 5-9 5-9-5Z" />
        <path d="M7 11v5c3 2 7 2 10 0v-5M21 8v6" />
      </>
    ),
    file: (
      <>
        <path d="M6 2h9l4 4v16H6V2Z" />
        <path d="M14 2v5h5M9 12h7M9 16h7" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21c0-4 3-7 7-7s7 3 7 7M17 4a4 4 0 0 1 0 8M18 15c3 1 4 3 4 6" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.4 3a8 8 0 0 0-1.7 1L5 6.1 3 9.5 5.1 11a7 7 0 0 0 0 2L3 14.5 5 18l2.4-1a8 8 0 0 0 1.7 1l.4 3h5l.4-3a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2.1-1.5a7 7 0 0 0 .1-1Z" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="7" />
        <path d="m15 15 6 6" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    arrow: (
      <>
        <path d="m9 18 6-6-6-6" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m0 0 5-5m-5 5-5-5M4 21h16" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    close: (
      <>
        <path d="m5 5 14 14M19 5 5 19" />
      </>
    ),
    logout: (
      <>
        <path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10" />
      </>
    ),
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------

const nav = [
  { id: 'panel', label: 'Panel', icon: 'grid' },
  { id: 'aspectos', label: 'Aspectos e impactos', icon: 'leaf' },
  { id: 'legales', label: 'Requisitos legales', icon: 'scale' },
  { id: 'objetivos', label: 'Objetivos', icon: 'target' },
  { id: 'auditorias', label: 'Auditorías', icon: 'clipboard' },
  { id: 'conformidades', label: 'No conformidades', icon: 'alert' },
  { id: 'incidentes', label: 'Incidentes', icon: 'alert' },
  { id: 'capacitacion', label: 'Capacitación', icon: 'training' },
  { id: 'evidencias', label: 'Evidencias', icon: 'file' },
  { id: 'reportes', label: 'Indicadores', icon: 'chart' },
  { id: 'usuarios', label: 'Usuarios y roles', icon: 'users' },
  { id: 'parametros', label: 'Parámetros', icon: 'settings' },
] as const

type PageId = (typeof nav)[number]['id'] | 'notificaciones'

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

const badge: Record<string, string> = {
  Alta: 'bg-[#F8DAD4] text-[#A8321F]',
  Media: 'bg-[#FBEBCB] text-[#8A5700]',
  Baja: 'bg-[#DDEBDD] text-[#2F6B3F]',
  Activo: 'bg-[#DDEBDD] text-[#2F6B3F]',
  Cumplido: 'bg-[#DDEBDD] text-[#2F6B3F]',
  Cumple: 'bg-[#DDEBDD] text-[#2F6B3F]',
  'En aprobación': 'bg-[#DCEAF5] text-[#1F5F8B]',
  'En ejecución': 'bg-[#DCEAF5] text-[#1F5F8B]',
  Programada: 'bg-[#DCEAF5] text-[#1F5F8B]',
  Detectada: 'bg-[#FBEBCB] text-[#8A5700]',
  Desviado: 'bg-[#FBEBCB] text-[#8A5700]',
  Vencida: 'bg-[#F8DAD4] text-[#A8321F]',
  Escalada: 'bg-[#F8DAD4] text-[#A8321F]',
  Pendiente: 'bg-[#ECEFF1] text-[#596168]',
  Borrador: 'bg-[#ECEFF1] text-[#596168]',
  'Sin evaluar': 'bg-[#ECEFF1] text-[#596168]',
}

function Badge({ children }: { children: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badge[children] || 'bg-[#DCEAF5] text-[#1F5F8B]'}`}
    >
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function Skeleton() {
  return <div className="animate-pulse h-8 w-16 rounded bg-gray-200" />
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

function Login({ onLogin }: { onLogin: (user: AppUser) => void }) {
  const [showRegister, setShowRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [nit, setNit] = useState('')
  const [sector, setSector] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      let result: { success: boolean; data?: unknown; error?: string }
      if (showRegister) {
        result = await registerUser({ orgName, nit, sector, name, email, password })
      } else {
        result = await loginUser(email, password)
      }
      if (result.success && result.data) {
        const u = result.data as {
          id: string | number
          name?: string
          email?: string
          role?: string
          organization?: { id: string | number; name?: string } | string | number
        }
        const orgRaw = u.organization
        const org =
          orgRaw && typeof orgRaw === 'object' && 'id' in orgRaw
            ? { id: String(orgRaw.id), name: (orgRaw as { id: string | number; name?: string }).name ?? '' }
            : undefined
        onLogin({
          id: String(u.id),
          name: u.name ?? email,
          email: u.email ?? email,
          role: u.role ?? 'collaborator',
          organization: org,
        })
      } else {
        setError(result.error ?? 'Error al iniciar sesión')
      }
    })
  }

  return (
    <main className="grid min-h-screen bg-[#F2F6F1] lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden overflow-hidden bg-[#214E31] p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-white/15">
            <Icon name="leaf" size={25} />
          </div>
          <span className="text-xl font-semibold tracking-tight">EcoCert 360</span>
        </div>
        <div className="relative max-w-xl">
          <div className="mb-8 h-1 w-16 rounded bg-[#9DC9A8]" />
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.04em]">
            Tu gestión ambiental, clara y bajo control.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/70">
            Centraliza evidencias, objetivos, requisitos y auditorías para avanzar con confianza
            hacia la certificación ISO 14001.
          </p>
        </div>
        <p className="relative text-sm text-white/50">Gestión ambiental · ISO 14001:2015</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="grid size-10 place-items-center rounded-xl bg-[#2F6B3F] text-white">
              <Icon name="leaf" />
            </div>
            <span className="text-xl font-semibold">EcoCert 360</span>
          </div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[.16em] text-[#2F6B3F]">
            {showRegister ? 'Nueva organización' : 'Bienvenido de nuevo'}
          </p>
          <h2 className="text-3xl font-semibold tracking-[-.03em] text-[#17251B]">
            {showRegister ? 'Crea tu cuenta' : 'Inicia sesión'}
          </h2>
          <p className="mt-2 text-[#5B6B5F]">
            {showRegister
              ? 'Registra los datos básicos de tu organización.'
              : 'Ingresa para continuar con tu gestión ambiental.'}
          </p>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {showRegister && (
              <>
                <label className="block text-sm font-medium">
                  Organización
                  <input
                    required
                    className="field mt-2"
                    placeholder="Nombre de la organización"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                  />
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-sm font-medium">
                    NIT
                    <input
                      required
                      className="field mt-2"
                      placeholder="900.123.456-7"
                      value={nit}
                      onChange={(e) => setNit(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Sector
                    <input
                      required
                      className="field mt-2"
                      placeholder="Manufactura"
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                    />
                  </label>
                </div>
                <label className="block text-sm font-medium">
                  Nombre completo
                  <input
                    required
                    className="field mt-2"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
              </>
            )}
            <label className="block text-sm font-medium">
              Correo electrónico
              <input
                required
                type="email"
                className="field mt-2"
                placeholder="nombre@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Contraseña
              <input
                required
                type="password"
                className="field mt-2"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {!showRegister && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-[#5B6B5F]">
                  <input type="checkbox" className="accent-[#2F6B3F]" /> Recordarme
                </label>
                <button type="button" className="font-medium text-[#2F6B3F]">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isPending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2F6B3F] font-semibold text-white transition hover:bg-[#245431] disabled:opacity-60"
            >
              {isPending ? 'Procesando...' : showRegister ? 'Crear organización' : 'Ingresar'}{' '}
              {!isPending && <Icon name="arrow" size={17} />}
            </button>
          </form>
          <p className="mt-7 text-center text-sm text-[#5B6B5F]">
            {showRegister ? '¿Ya tienes una cuenta?' : '¿Aún no tienes una cuenta?'}{' '}
            <button
              className="font-semibold text-[#2F6B3F]"
              onClick={() => setShowRegister(!showRegister)}
            >
              {showRegister ? 'Inicia sesión' : 'Regístrate'}
            </button>
          </p>
          <div className="mt-7 rounded-lg border border-[#CBD8CB] bg-white px-4 py-3 text-center text-xs text-[#5B6B5F]">
            Modo demostración: usa cualquier correo y contraseña para explorar la plataforma.
          </div>
        </div>
      </section>
    </main>
  )
}

// ---------------------------------------------------------------------------
// PageHeading
// ---------------------------------------------------------------------------

function PageHeading({
  title,
  desc,
  action,
  onAction,
}: {
  title: string
  desc: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-.025em] sm:text-[28px]">{title}</h1>
        <p className="mt-1 text-sm text-[#5B6B5F] sm:text-base">{desc}</p>
      </div>
      {action && (
        <button onClick={onAction} className="primary-btn">
          <Icon name="plus" size={17} />
          {action}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

function Dashboard({ go }: { go: (p: PageId) => void }) {
  const { currentUser, organizationId } = useContext(AppContext)
  const [loading, setLoading] = useState(true)
  const [aspectCount, setAspectCount] = useState(0)
  const [objectiveCount, setObjectiveCount] = useState(0)
  const [ncCount, setNcCount] = useState(0)
  const [expiringCount, setExpiringCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [objectives, setObjectives] = useState<
    { title: string; progress: number; amount: string; status: string }[]
  >([])

  useEffect(() => {
    if (!organizationId) return
    const orgId = organizationId
    const userId = currentUser?.id

    const fetchAll = async () => {
      setLoading(true)
      try {
        const [aspectsRes, objectivesRes, ncRes, legalRes, notifsRes] = await Promise.all([
          getAspects(orgId),
          getObjectives(orgId),
          getNonConformities(orgId),
          getLegalRequirements(orgId),
          userId ? getNotifications(userId) : Promise.resolve({ success: true, data: [] }),
        ])

        const aspectDocs = (aspectsRes.data as unknown[]) ?? []
        setAspectCount(aspectDocs.filter((d: unknown) => (d as { level?: string }).level === 'Alta').length)

        const objDocs = (objectivesRes.data as unknown[]) ?? []
        setObjectiveCount(objDocs.filter((d: unknown) => (d as { status?: string }).status === 'Activo').length)
        setObjectives(
          objDocs.slice(0, 3).map((d: unknown) => {
            const obj = d as {
              title?: string
              currentValue?: number
              target?: number
              unit?: string
              status?: string
            }
            const progress =
              obj.target && obj.target > 0
                ? Math.min(100, Math.round(((obj.currentValue ?? 0) / obj.target) * 100))
                : 0
            return {
              title: obj.title ?? '—',
              progress,
              amount: `${obj.currentValue ?? 0} de ${obj.target ?? 0} ${obj.unit ?? ''}`,
              status: obj.status ?? 'Borrador',
            }
          }),
        )

        const ncDocs = (ncRes.data as unknown[]) ?? []
        setNcCount(
          ncDocs.filter((d: unknown) => {
            const s = (d as { status?: string }).status
            return s && !['Cerrada'].includes(s)
          }).length,
        )

        const legalDocs = (legalRes.data as unknown[]) ?? []
        const now = Date.now()
        const thirtyDays = 30 * 24 * 60 * 60 * 1000
        setExpiringCount(
          legalDocs.filter((d: unknown) => {
            const doc = d as { nextReview?: string }
            if (!doc.nextReview) return false
            const diff = new Date(doc.nextReview).getTime() - now
            return diff > 0 && diff <= thirtyDays
          }).length,
        )

        const notifDocs = (notifsRes.data as unknown[]) ?? []
        setUnreadCount(notifDocs.filter((d: unknown) => !(d as { read?: boolean }).read).length)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [organizationId, currentUser?.id])

  const kpis = [
    {
      label: 'Aspectos significativos',
      value: loading ? null : String(aspectCount),
      change: 'Nivel alto',
      icon: 'leaf' as IconName,
      tone: 'bg-[#E4F0E5] text-[#2F6B3F]',
      page: 'aspectos' as PageId,
    },
    {
      label: 'Objetivos activos',
      value: loading ? null : String(objectiveCount),
      change: 'En curso',
      icon: 'target' as IconName,
      tone: 'bg-[#E4EDF5] text-[#1F5F8B]',
      page: 'objetivos' as PageId,
    },
    {
      label: 'No conformidades',
      value: loading ? null : String(ncCount),
      change: 'Abiertas',
      icon: 'alert' as IconName,
      tone: 'bg-[#F8E4DF] text-[#A8321F]',
      page: 'conformidades' as PageId,
    },
    {
      label: 'Requisitos por vencer',
      value: loading ? null : String(expiringCount),
      change: 'Próximos 30 días',
      icon: 'calendar' as IconName,
      tone: 'bg-[#FAEDD6] text-[#A86A00]',
      page: 'legales' as PageId,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <button
            key={k.label}
            onClick={() => go(k.page)}
            className="card group p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className={`grid size-10 place-items-center rounded-lg ${k.tone}`}>
                <Icon name={k.icon} />
              </div>
              <Icon name="arrow" size={16} />
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-tight">
              {k.value === null ? <Skeleton /> : k.value}
            </p>
            <p className="mt-1 text-sm font-medium">{k.label}</p>
            <p className="mt-2 text-xs text-[#5B6B5F]">{k.change}</p>
          </button>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">Progreso de objetivos</h2>
              <p className="mt-1 text-sm text-[#5B6B5F]">
                Seguimiento de metas ambientales activas
              </p>
            </div>
            <button onClick={() => go('objetivos')} className="text-sm font-semibold text-[#2F6B3F]">
              Ver todos
            </button>
          </div>
          <div className="mt-7 space-y-6">
            {loading
              ? [1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-4 w-48 rounded bg-gray-200" />
                    <div className="h-2 w-full rounded-full bg-gray-200" />
                  </div>
                ))
              : objectives.length === 0
                ? <p className="text-sm text-[#5B6B5F]">Sin objetivos registrados.</p>
                : objectives.map((obj) => (
                    <div key={obj.title}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{obj.title}</p>
                          <p className="mt-0.5 text-xs text-[#5B6B5F]">{obj.amount}</p>
                        </div>
                        <Badge>{obj.status}</Badge>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#E5ECE5]">
                        <div
                          className="h-full rounded-full bg-[#2F6B3F]"
                          style={{ width: `${obj.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
          </div>
        </section>
        <section className="card p-6">
          <h2 className="section-title">No conformidades</h2>
          <p className="mt-1 text-sm text-[#5B6B5F]">Distribución por estado</p>
          <div className="mt-7 flex items-end justify-around gap-3 border-b border-[#DDE5DD] pb-2">
            {[
              ['Detectada', 35, '#DCA444'],
              ['Análisis', 58, '#5A8DB2'],
              ['Ejecución', 78, '#2F6B3F'],
              ['Vencida', 28, '#B94B39'],
            ].map(([l, h, c]) => (
              <div key={l as string} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-semibold">{Math.round(Number(h) / 20)}</span>
                <div
                  className="w-full max-w-11 rounded-t-md"
                  style={{ height: h, backgroundColor: c as string }}
                />
                <span className="text-[10px] text-[#5B6B5F]">{l}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => go('conformidades')}
            className="mt-5 w-full text-center text-sm font-semibold text-[#2F6B3F]"
          >
            Gestionar no conformidades
          </button>
        </section>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="section-title">Notificaciones recientes</h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[#F8DAD4] px-2 py-1 text-xs font-semibold text-[#A8321F]">
                {unreadCount} sin leer
              </span>
            )}
          </div>
          <div className="border-t border-[#E4EAE4] px-6 py-4 text-sm text-[#5B6B5F]">
            <button
              className="font-semibold text-[#2F6B3F]"
              onClick={() => go('notificaciones')}
            >
              Ver notificaciones →
            </button>
          </div>
        </section>
        <section className="card p-6">
          <div className="flex justify-between">
            <h2 className="section-title">Cumplimiento legal</h2>
          </div>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-[#ECEFF1]">
            <div className="h-full w-[87%] bg-[#2F6B3F]" />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-semibold">—</p>
              <p className="text-xs text-[#5B6B5F]">Cumplen</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-[#A8321F]">—</p>
              <p className="text-xs text-[#5B6B5F]">No cumplen</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-[#6B7280]">—</p>
              <p className="text-xs text-[#5B6B5F]">Sin evaluar</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TablePage
// ---------------------------------------------------------------------------

type TableConfig = {
  title: string
  desc: string
  button: string
  headers: string[]
  rows: string[][]
}

function TablePage({
  page,
  onAdd,
  refreshKey,
}: {
  page: PageId
  onAdd: () => void
  refreshKey?: number
}) {
  const { currentUser, organizationId } = useContext(AppContext)
  const [rows, setRows] = useState<string[][]>([])
  const [loading, setLoading] = useState(false)

  const fetchRows = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      if (page === 'aspectos') {
        const res = await getAspects(organizationId)
        const docs = (res.data as unknown[]) ?? []
        setRows(
          docs.map((d: unknown) => {
            const doc = d as {
              id?: string | number
              name?: string
              impact?: string
              significance?: number
              level?: string
              activity?: string
            }
            return [
              `AS-${String(doc.id ?? '').slice(-4).padStart(3, '0')}`,
              doc.name ?? '—',
              doc.impact ?? '—',
              String(doc.significance ?? '—'),
              doc.level ?? 'Pendiente',
              doc.activity ?? '—',
            ]
          }),
        )
      } else if (page === 'legales') {
        const res = await getLegalRequirements(organizationId)
        const docs = (res.data as unknown[]) ?? []
        setRows(
          docs.map((d: unknown) => {
            const doc = d as {
              title?: string
              issuer?: string
              aspect?: string
              nextReview?: string
              compliance?: string
            }
            return [
              doc.title ?? '—',
              doc.issuer ?? '—',
              doc.aspect ?? '—',
              formatDate(doc.nextReview),
              doc.compliance ?? 'Sin evaluar',
            ]
          }),
        )
        // RN-03: notify current user about documents expiring within 7, 15, or 30 days
        if (currentUser?.id) {
          const now = Date.now()
          const thresholds = [
            { days: 7, label: '7 días' },
            { days: 15, label: '15 días' },
            { days: 30, label: '30 días' },
          ]
          for (const doc of docs) {
            const d = doc as { id?: string | number; title?: string; nextReview?: string }
            if (!d.nextReview) continue
            const diff = new Date(d.nextReview).getTime() - now
            if (diff <= 0) continue
            const diffDays = diff / (1000 * 60 * 60 * 24)
            const threshold = thresholds.find((t) => diffDays <= t.days)
            if (threshold) {
              createNotification({
                userId: currentUser.id,
                type: 'expiry-warning',
                message: `El requisito legal "${d.title ?? '—'}" vence en menos de ${threshold.label}.`,
                reference: d.id ? String(d.id) : undefined,
              }).catch(() => {/* non-blocking */})
            }
          }
        }
      } else if (page === 'auditorias') {
        const res = await getAudits(organizationId)
        const docs = (res.data as unknown[]) ?? []
        setRows(
          docs.map((d: unknown) => {
            const doc = d as {
              id?: string | number
              area?: string
              date?: string
              auditor?: { name?: string } | string
              status?: string
            }
            const auditorName =
              typeof doc.auditor === 'object' && doc.auditor !== null
                ? (doc.auditor as { name?: string }).name ?? '—'
                : String(doc.auditor ?? '—')
            return [
              `AUD-${String(doc.id ?? '').slice(-4).padStart(3, '0')}`,
              doc.area ?? '—',
              formatDate(doc.date),
              auditorName,
              doc.status ?? '—',
            ]
          }),
        )
      } else if (page === 'incidentes') {
        const res = await getIncidents(organizationId)
        const docs = (res.data as unknown[]) ?? []
        setRows(
          docs.map((d: unknown) => {
            const doc = d as {
              id?: string | number
              type?: string
              description?: string
              date?: string
              severity?: string
              status?: string
            }
            return [
              `INC-${String(doc.id ?? '').slice(-4).padStart(3, '0')}`,
              doc.type ?? '—',
              doc.description ?? '—',
              formatDate(doc.date),
              doc.severity ?? '—',
              doc.status ?? '—',
            ]
          }),
        )
      } else if (page === 'capacitacion') {
        const res = await getTrainings(organizationId)
        const docs = (res.data as unknown[]) ?? []
        setRows(
          docs.map((d: unknown) => {
            const doc = d as {
              topic?: string
              date?: string
              attendee?: { name?: string } | string
              result?: number
              competent?: string
            }
            const attendeeName =
              typeof doc.attendee === 'object' && doc.attendee !== null
                ? (doc.attendee as { name?: string }).name ?? '—'
                : String(doc.attendee ?? '—')
            return [
              doc.topic ?? '—',
              formatDate(doc.date),
              attendeeName,
              doc.result !== undefined ? `${doc.result}%` : '—',
              doc.competent ?? '—',
            ]
          }),
        )
      } else if (page === 'evidencias') {
        const res = await getEvidences(organizationId)
        const docs = (res.data as unknown[]) ?? []
        setRows(
          docs.map((d: unknown) => {
            const doc = d as {
              description?: string
              sourceTable?: string
              recordId?: string
              statusReview?: string
            }
            return [
              doc.description ?? '—',
              doc.sourceTable ?? '—',
              doc.recordId ?? '—',
              '—',
              doc.statusReview ?? 'Pendiente',
            ]
          }),
        )
      } else if (page === 'usuarios') {
        const res = await getUsers(organizationId)
        const docs = (res.data as unknown[]) ?? []
        setRows(
          docs.map((d: unknown) => {
            const doc = d as {
              name?: string
              email?: string
              role?: string
              active?: boolean
            }
            return [
              doc.name ?? '—',
              doc.email ?? '—',
              roleLabelMap[doc.role ?? ''] ?? doc.role ?? '—',
              'Desconocido',
              doc.active ? 'Activo' : 'Inactivo',
            ]
          }),
        )
      }
    } finally {
      setLoading(false)
    }
  }, [organizationId, page])

  useEffect(() => {
    fetchRows()
  }, [fetchRows, refreshKey])

  const configs: Record<string, TableConfig> = {
    aspectos: {
      title: 'Aspectos e impactos',
      desc: 'Identifica, evalúa y controla los impactos ambientales.',
      button: 'Nuevo aspecto',
      headers: ['Código', 'Aspecto', 'Impacto', 'Significancia', 'Nivel', 'Actividad'],
      rows,
    },
    legales: {
      title: 'Matriz de requisitos legales',
      desc: 'Controla el cumplimiento y las próximas revisiones.',
      button: 'Nuevo requisito',
      headers: ['Requisito', 'Entidad', 'Aspecto asociado', 'Próxima revisión', 'Cumplimiento'],
      rows,
    },
    auditorias: {
      title: 'Auditorías',
      desc: 'Programa y documenta las evaluaciones del sistema.',
      button: 'Programar auditoría',
      headers: ['Auditoría', 'Área', 'Fecha', 'Auditor', 'Estado'],
      rows,
    },
    incidentes: {
      title: 'Incidentes y emergencias',
      desc: 'Reporta eventos y realiza seguimiento a la respuesta.',
      button: 'Reportar incidente',
      headers: ['Código', 'Tipo', 'Descripción', 'Fecha', 'Severidad', 'Estado'],
      rows,
    },
    capacitacion: {
      title: 'Capacitación y competencia',
      desc: 'Gestiona formación y evalúa la competencia ambiental.',
      button: 'Nueva capacitación',
      headers: ['Capacitación', 'Fecha', 'Asistente', 'Resultado', 'Competencia'],
      rows,
    },
    evidencias: {
      title: 'Evidencias de cumplimiento',
      desc: 'Centraliza soportes de proveedores y requisitos.',
      button: 'Cargar evidencia',
      headers: ['Descripción', 'Colección', 'Registro', 'Fecha', 'Estado'],
      rows,
    },
    usuarios: {
      title: 'Usuarios y roles',
      desc: 'Administra accesos y responsabilidades de tu organización.',
      button: 'Invitar usuario',
      headers: ['Usuario', 'Correo', 'Rol', 'Último acceso', 'Estado'],
      rows,
    },
  }

  const c = configs[page]
  if (!c) return null

  const canAddAspect =
    currentUser?.role === 'environmental_manager' || currentUser?.role === 'administrator'
  const showAddButton = page !== 'aspectos' || canAddAspect

  return (
    <div>
      <PageHeading
        title={c.title}
        desc={c.desc}
        action={showAddButton ? c.button : undefined}
        onAction={showAddButton ? onAdd : undefined}
      />
      <div className="card mt-6 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#DDE5DD] p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#758178]">
              <Icon name="search" size={17} />
            </span>
            <input
              className="h-10 w-full rounded-lg border border-[#CBD8CB] bg-[#F8FAF8] pl-10 pr-3 text-sm outline-none focus:border-[#2F6B3F]"
              placeholder="Buscar en esta sección..."
            />
          </div>
          <select className="h-10 rounded-lg border border-[#CBD8CB] bg-white px-3 text-sm">
            <option>Todos los estados</option>
            <option>Activos</option>
            <option>Pendientes</option>
          </select>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-10 rounded bg-gray-100" />
            ))}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F7F9F7] text-xs uppercase tracking-wide text-[#5B6B5F]">
                  <tr>
                    {c.headers.map((h) => (
                      <th key={h} className="px-5 py-3 font-semibold">
                        {h}
                      </th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {c.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={c.headers.length + 1}
                        className="px-5 py-8 text-center text-sm text-[#5B6B5F]"
                      >
                        Sin registros.
                      </td>
                    </tr>
                  ) : (
                    c.rows.map((row, i) => (
                      <tr key={i} className="border-t border-[#E5EBE5] hover:bg-[#F8FAF8]">
                        {row.map((v, j) => (
                          <td key={j} className={`px-5 py-4 ${j === 0 ? 'font-semibold' : ''}`}>
                            {j === row.length - 1 &&
                            (badge[v] ||
                              [
                                'Aprobada',
                                'Activo',
                                'En seguimiento',
                                'Competente',
                                'Cerrado',
                              ].includes(v)) ? (
                              <Badge>{v}</Badge>
                            ) : (
                              v
                            )}
                          </td>
                        ))}
                        <td className="px-4">
                          <button className="grid size-8 place-items-center rounded hover:bg-[#E7EEE7]">
                            <Icon name="arrow" size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-[#E5EBE5] md:hidden">
              {c.rows.map((row, i) => (
                <button key={i} className="block w-full p-4 text-left">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold">{row[1] || row[0]}</p>
                    <Icon name="arrow" size={16} />
                  </div>
                  <p className="mt-1 text-sm text-[#5B6B5F]">
                    {row[0]} · {row[2]}
                  </p>
                  <div className="mt-3">
                    <Badge>{row[row.length - 1]}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Objectives page
// ---------------------------------------------------------------------------

function ObjectivesPage({ onAdd }: { onAdd: () => void }) {
  const { currentUser, organizationId } = useContext(AppContext)
  const [cards, setCards] = useState<
    {
      title: string
      owner: string
      progress: number
      status: string
      target: string
      deadline: string
    }[]
  >([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!organizationId) return
    setLoading(true)
    getObjectives(organizationId)
      .then((res) => {
        const docs = (res.data as unknown[]) ?? []
        setCards(
          docs.map((d: unknown) => {
            const doc = d as {
              title?: string
              owner?: { name?: string } | string
              currentValue?: number
              target?: number
              unit?: string
              status?: string
              deadline?: string
            }
            const ownerName =
              typeof doc.owner === 'object' && doc.owner !== null
                ? (doc.owner as { name?: string }).name ?? '—'
                : String(doc.owner ?? '—')
            const progress =
              doc.target && doc.target > 0
                ? Math.min(100, Math.round(((doc.currentValue ?? 0) / doc.target) * 100))
                : 0
            return {
              title: doc.title ?? '—',
              owner: ownerName,
              progress,
              status: doc.status ?? 'Borrador',
              target: `${doc.target ?? 0} ${doc.unit ?? ''}`,
              deadline: formatDate(doc.deadline),
            }
          }),
        )
      })
      .finally(() => setLoading(false))
  }, [organizationId])

  const canApprove =
    currentUser?.role === 'senior_management' || currentUser?.role === 'administrator'

  return (
    <div>
      <PageHeading
        title="Objetivos ambientales"
        desc="Define metas SMART y monitorea el avance del plan."
        action="Nuevo objetivo"
        onAction={onAdd}
      />
      {loading ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse p-5 space-y-3">
              <div className="h-6 w-32 rounded bg-gray-200" />
              <div className="h-4 w-48 rounded bg-gray-100" />
              <div className="h-2 rounded-full bg-gray-100" />
            </div>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <p className="mt-6 text-sm text-[#5B6B5F]">Sin objetivos registrados.</p>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {cards.map((x) => (
            <div key={x.title} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-[#E7F0E7] text-[#2F6B3F]">
                  <Icon name="target" />
                </div>
                <Badge>{x.status}</Badge>
              </div>
              <h3 className="mt-5 font-semibold leading-6">{x.title}</h3>
              <p className="mt-1 text-sm text-[#5B6B5F]">Responsable: {x.owner}</p>
              <div className="mt-6 flex items-end justify-between">
                <p className="text-2xl font-semibold">{x.progress}%</p>
                <p className="text-xs text-[#5B6B5F]">Meta {x.target}</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E6ECE6]">
                <div
                  className={`h-full rounded-full ${x.status === 'Desviado' ? 'bg-[#A86A00]' : 'bg-[#2F6B3F]'}`}
                  style={{ width: `${x.progress}%` }}
                />
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-[#E5EBE5] pt-4 text-xs text-[#5B6B5F]">
                <span className="flex items-center gap-1.5">
                  <Icon name="calendar" size={14} />
                  {x.deadline}
                </span>
                {canApprove && (
                  <button className="font-semibold text-[#2F6B3F]">Aprobar objetivo</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// NonConformities page
// ---------------------------------------------------------------------------

function NonConformities() {
  const { organizationId } = useContext(AppContext)
  const [ncDocs, setNcDocs] = useState<
    { id: string; code: string; description: string; criticality: string; status: string }[]
  >([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!organizationId) return
    setLoading(true)
    getNonConformities(organizationId)
      .then((res) => {
        const docs = (res.data as unknown[]) ?? []
        setNcDocs(
          docs.map((d: unknown) => {
            const doc = d as {
              id?: string | number
              code?: string
              description?: string
              criticality?: string
              status?: string
            }
            return {
              id: String(doc.id ?? ''),
              code: doc.code ?? '—',
              description: doc.description ?? '—',
              criticality: doc.criticality ?? 'Normal',
              status: doc.status ?? 'Detectada',
            }
          }),
        )
      })
      .finally(() => setLoading(false))
  }, [organizationId])

  const columnDefs = ['Detectada', 'Escalada', 'En análisis', 'En ejecución', 'En verificación'] as const

  return (
    <div>
      <PageHeading
        title="No conformidades"
        desc="Gestiona hallazgos y acciones correctivas hasta su cierre."
      />
      {loading ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-5">
          {columnDefs.map((col) => (
            <div key={col} className="animate-pulse rounded-xl bg-[#E9EFE9] p-3 space-y-3">
              <div className="h-4 w-24 rounded bg-gray-200" />
              <div className="h-20 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 xl:grid-cols-5">
          {columnDefs.map((col) => {
            const colDocs = ncDocs.filter((n) => n.status === col)
            return (
              <section key={col} className="rounded-xl bg-[#E9EFE9] p-3">
                <div className="flex items-center justify-between px-1 py-2">
                  <h3 className="text-sm font-semibold">{col}</h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs">{colDocs.length}</span>
                </div>
                <div className="mt-2 space-y-3">
                  {colDocs.map((n) => (
                    <button
                      key={n.id}
                      className="w-full rounded-lg border border-[#D7E1D7] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5"
                    >
                      <div className="flex justify-between">
                        <span className="text-xs font-semibold text-[#2F6B3F]">{n.code}</span>
                        <Badge>{n.criticality === 'Crítica' ? 'Alta' : 'Media'}</Badge>
                      </div>
                      <p className="mt-3 text-sm font-medium leading-5">{n.description}</p>
                      <div className="mt-4 flex items-center justify-between text-xs text-[#5B6B5F]">
                        <span>{n.criticality}</span>
                        <Icon name="arrow" size={14} />
                      </div>
                    </button>
                  ))}
                  {colDocs.length === 0 && (
                    <p className="px-2 py-4 text-xs text-[#5B6B5F]">Sin registros</p>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Notifications page
// ---------------------------------------------------------------------------

function NotificationsPage() {
  const { currentUser } = useContext(AppContext)
  const [notifs, setNotifs] = useState<
    { id: string; message: string; type: string; read: boolean }[]
  >([])
  const [loading, setLoading] = useState(false)

  const fetchNotifs = useCallback(async () => {
    if (!currentUser?.id) return
    setLoading(true)
    const res = await getNotifications(currentUser.id)
    const docs = (res.data as unknown[]) ?? []
    setNotifs(
      docs.map((d: unknown) => {
        const doc = d as { id?: string | number; message?: string; type?: string; read?: boolean }
        return {
          id: String(doc.id ?? ''),
          message: doc.message ?? '—',
          type: doc.type ?? 'info',
          read: doc.read ?? false,
        }
      }),
    )
    setLoading(false)
  }, [currentUser?.id])

  useEffect(() => {
    fetchNotifs()
  }, [fetchNotifs])

  const handleMark = async (id: string) => {
    await markNotificationRead(id)
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  return (
    <div>
      <PageHeading
        title="Notificaciones"
        desc="Consulta y gestiona los avisos relacionados con tu trabajo."
      />
      {loading ? (
        <div className="card mt-6 divide-y divide-[#E4EAE4]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex gap-4 p-5">
              <div className="size-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded bg-gray-200" />
                <div className="h-3 w-24 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card mt-6 divide-y divide-[#E4EAE4]">
          {notifs.length === 0 && (
            <p className="p-6 text-sm text-[#5B6B5F]">Sin notificaciones.</p>
          )}
          {notifs.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.read && handleMark(n.id)}
              className={`flex w-full gap-4 p-5 text-left hover:bg-[#F7FAF7] ${!n.read ? 'bg-[#F4F8F4]' : ''}`}
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#DDEBDD] text-[#2F6B3F]">
                <Icon name="bell" size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{n.message}</p>
                <p className="mt-1 text-xs text-[#5B6B5F]">{n.type}</p>
              </div>
              {!n.read && <span className="mt-1 size-2 rounded-full bg-[#2F6B3F]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

function Reports() {
  const exportCSV = () => {
    const csv =
      'Indicador,Valor,Periodo\nCumplimiento legal,87%,2026\nObjetivos cumplidos,75%,2026\nNo conformidades abiertas,4,2026'
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'ecocert-360-indicadores.csv'
    a.click()
  }
  return (
    <div>
      <PageHeading
        title="Indicadores y reportes"
        desc="Analiza el desempeño ambiental de la organización."
      />
      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={exportCSV} className="secondary-btn">
          <Icon name="download" size={17} />
          Exportar CSV
        </button>
        <button onClick={() => window.print()} className="secondary-btn">
          <Icon name="file" size={17} />
          Imprimir PDF
        </button>
        <select className="ml-auto h-10 rounded-lg border border-[#CBD8CB] bg-white px-3 text-sm">
          <option>Últimos 12 meses</option>
          <option>Este trimestre</option>
        </select>
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {(['Cumplimiento legal', 'Objetivos cumplidos', 'Aspectos en nivel alto', 'NC cerradas'] as const).map(
          (label, i) => (
            <div key={label} className="card p-5">
              <p className="text-sm text-[#5B6B5F]">{label}</p>
              <p className="mt-3 text-3xl font-semibold">
                {['87%', '75%', '8', '18'][i]}
              </p>
              <p className="mt-2 text-xs font-medium text-[#2F6B3F]">↑ 6% vs. periodo anterior</p>
            </div>
          ),
        )}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="section-title">Aspectos por nivel</h2>
          <div className="mt-8 space-y-5">
            {[
              ['Alta', 8, 35],
              ['Media', 11, 48],
              ['Baja', 4, 17],
            ].map((x) => (
              <div
                key={x[0] as string}
                className="grid grid-cols-[60px_1fr_40px] items-center gap-3 text-sm"
              >
                <Badge>{x[0] as string}</Badge>
                <div className="h-3 rounded-full bg-[#E8EDE8]">
                  <div
                    className="h-full rounded-full bg-[#2F6B3F]"
                    style={{ width: `${x[2]}%` }}
                  />
                </div>
                <span className="font-semibold">{x[1]}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="card p-6">
          <h2 className="section-title">Tendencia de no conformidades</h2>
          <div className="mt-9 flex h-40 items-end gap-3 border-b border-l border-[#CBD8CB] px-4">
            {[58, 70, 45, 78, 62, 38, 54, 30].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-[#8FB59A] transition hover:bg-[#2F6B3F]"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between pl-4 text-[10px] text-[#5B6B5F]">
            <span>Abr</span>
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Ago</span>
            <span>Sep</span>
            <span>Oct</span>
            <span>Nov</span>
          </div>
        </section>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

function Parameters() {
  return (
    <div>
      <PageHeading
        title="Parámetros del sistema"
        desc="Configura umbrales y alertas para tu organización."
      />
      <div className="mt-6 grid max-w-3xl gap-6">
        <section className="card p-6">
          <h2 className="section-title">Significancia ambiental</h2>
          <p className="mt-1 text-sm text-[#5B6B5F]">
            Los niveles se calculan como severidad × frecuencia × alcance.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Umbral nivel alto
              <input className="field mt-2" type="number" defaultValue="60" />
            </label>
            <label className="text-sm font-medium">
              Umbral nivel medio
              <input className="field mt-2" type="number" defaultValue="27" />
            </label>
          </div>
        </section>
        <section className="card p-6">
          <h2 className="section-title">Alertas de vencimiento</h2>
          <p className="mt-1 text-sm text-[#5B6B5F]">
            Define cuándo se crearán notificaciones preventivas.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {['30 días antes', '15 días antes', '7 días antes'].map((x) => (
              <label
                key={x}
                className="flex items-center gap-2 rounded-lg border border-[#CBD8CB] px-4 py-3 text-sm"
              >
                <input defaultChecked type="checkbox" className="accent-[#2F6B3F]" />
                {x}
              </label>
            ))}
          </div>
        </section>
        <button className="primary-btn w-fit">
          <Icon name="check" size={17} />
          Guardar cambios
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

type UserDoc = { id: string; name: string }

function Modal({
  onClose,
  page,
  onSuccess,
}: {
  onClose: () => void
  page: PageId
  onSuccess?: () => void
}) {
  const { currentUser, organizationId } = useContext(AppContext)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Aspectos fields
  const [activity, setActivity] = useState('')
  const [aspectName, setAspectName] = useState('')
  const [impact, setImpact] = useState('')
  const [s, setS] = useState(4)
  const [f, setF] = useState(5)
  const [a, setA] = useState(3)
  const significance = s * f * a

  // Legales fields
  const [legalTitle, setLegalTitle] = useState('')
  const [issuer, setIssuer] = useState('')
  const [legalAspect, setLegalAspect] = useState('')
  const [nextReview, setNextReview] = useState('')
  const [compliance, setCompliance] = useState('Sin evaluar')
  const [responsibleId, setResponsibleId] = useState('')

  // Auditoria fields
  const [audArea, setAudArea] = useState('')
  const [audScope, setAudScope] = useState('')
  const [audCriteria, setAudCriteria] = useState('')
  const [audDate, setAudDate] = useState('')
  const [auditorId, setAuditorId] = useState('')
  const [audStatus, setAudStatus] = useState('Programada')
  const [findings, setFindings] = useState<
    { description: string; criteria: string; criticality: string; isNonConformity: boolean; evidenceUrl: string }[]
  >([])

  // Objetivos fields
  const [objTitle, setObjTitle] = useState('')
  const [objIndicator, setObjIndicator] = useState('')
  const [objTarget, setObjTarget] = useState('')
  const [objUnit, setObjUnit] = useState('')
  const [objDeadline, setObjDeadline] = useState('')
  const [objOwnerId, setObjOwnerId] = useState('')
  const [objStatus, setObjStatus] = useState('Borrador')
  const [objActions, setObjActions] = useState<
    { description: string; resources: string; deadline: string; responsible: string }[]
  >([{ description: '', resources: '', deadline: '', responsible: '' }])

  // Incidentes fields
  const [incType, setIncType] = useState('incidente')
  const [incDesc, setIncDesc] = useState('')
  const [incDate, setIncDate] = useState('')
  const [incLocation, setIncLocation] = useState('')
  const [incSeverity, setIncSeverity] = useState('Media')
  const [incPlan, setIncPlan] = useState('')
  const [incStatus, setIncStatus] = useState('Abierto')

  // Capacitacion fields
  const [trainTopic, setTrainTopic] = useState('')
  const [trainDate, setTrainDate] = useState('')
  const [trainAttendeeId, setTrainAttendeeId] = useState('')
  const [trainResult, setTrainResult] = useState('')
  const [trainCompetent, setTrainCompetent] = useState('Sí')

  // Evidencias fields
  const [evidDesc, setEvidDesc] = useState('')
  const [evidSource, setEvidSource] = useState('')
  const [evidRecordId, setEvidRecordId] = useState('')
  const [evidStatus, setEvidStatus] = useState('Pendiente')

  // Users list for selects
  const [users, setUsers] = useState<UserDoc[]>([])
  useEffect(() => {
    if (!organizationId) return
    getUsers(organizationId).then((res) => {
      const docs = (res.data as unknown[]) ?? []
      setUsers(
        docs.map((d: unknown) => {
          const doc = d as { id?: string | number; name?: string }
          return { id: String(doc.id ?? ''), name: doc.name ?? '—' }
        }),
      )
    })
  }, [organizationId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      let result: { success: boolean; data?: unknown; error?: string }

      if (page === 'aspectos') {
        result = await createAspect({
          organization: organizationId,
          activity,
          name: aspectName,
          impact,
          severity: s,
          frequency: f,
          scope: a,
          createdBy: currentUser?.id,
        })
      } else if (page === 'legales') {
        result = await createLegalRequirement({
          organization: organizationId,
          title: legalTitle,
          issuer,
          aspect: legalAspect,
          nextReview,
          compliance,
          responsible: responsibleId || undefined,
        })
      } else if (page === 'auditorias') {
        result = await createAudit({
          organization: organizationId,
          area: audArea,
          scope: audScope,
          criteria: audCriteria,
          date: audDate,
          auditor: auditorId,
          status: audStatus,
          findings,
        })
      } else if (page === 'objetivos') {
        // RN-05: validate actions
        for (const act of objActions) {
          if (!act.description || !act.resources || !act.deadline || !act.responsible) {
            setError('Cada acción debe tener descripción, recursos, fecha límite y responsable.')
            return
          }
        }
        result = await createObjective({
          organization: organizationId,
          title: objTitle,
          indicator: objIndicator,
          target: Number(objTarget),
          unit: objUnit,
          deadline: objDeadline,
          owner: objOwnerId,
          status: objStatus,
          actions: objActions.map((act) => ({
            description: act.description,
            resources: act.resources,
            deadline: act.deadline,
            responsible: act.responsible,
            completed: false,
          })),
        })
      } else if (page === 'incidentes') {
        result = await createIncident({
          organization: organizationId,
          type: incType,
          description: incDesc,
          date: incDate,
          location: incLocation,
          severity: incSeverity,
          responsePlan: incPlan,
          status: incStatus,
          reportedBy: currentUser?.id,
        })
      } else if (page === 'capacitacion') {
        result = await createTraining({
          organization: organizationId,
          topic: trainTopic,
          date: trainDate,
          attendee: trainAttendeeId || undefined,
          result: trainResult ? Number(trainResult) : undefined,
          competent: trainCompetent,
        })
      } else if (page === 'evidencias') {
        // TODO: file upload wiring — currently creating record without file.
        // To add file: POST FormData to /api/upload, get mediaId, pass as file field.
        result = await createEvidence({
          organization: organizationId,
          description: evidDesc,
          sourceTable: evidSource,
          recordId: evidRecordId,
          statusReview: evidStatus,
          uploadedBy: currentUser?.id,
        })
      } else {
        onClose()
        return
      }

      if (result.success) {
        onSuccess?.()
        onClose()
      } else {
        setError(result.error ?? 'Error al guardar el registro.')
      }
    })
  }

  const modalTitle: Record<string, string> = {
    aspectos: 'Evaluar nuevo aspecto',
    legales: 'Nuevo requisito legal',
    auditorias: 'Programar auditoría',
    objetivos: 'Nuevo objetivo',
    incidentes: 'Reportar incidente',
    capacitacion: 'Nueva capacitación',
    evidencias: 'Cargar evidencia',
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#122117]/55 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#E1E8E1] p-6">
          <div>
            <h2 className="text-xl font-semibold">{modalTitle[page] ?? 'Crear nuevo registro'}</h2>
            <p className="mt-1 text-sm text-[#5B6B5F]">Completa la información solicitada.</p>
          </div>
          <button
            onClick={onClose}
            className="grid size-9 place-items-center rounded-lg hover:bg-[#EDF2ED]"
          >
            <Icon name="close" />
          </button>
        </div>
        <form className="space-y-5 p-6" onSubmit={handleSubmit}>
          {/* ---- ASPECTOS ---- */}
          {page === 'aspectos' && (
            <>
              <label className="block text-sm font-medium">
                Actividad
                <input
                  required
                  className="field mt-2"
                  placeholder="Ej. Operación de caldera"
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Aspecto ambiental
                <input
                  required
                  className="field mt-2"
                  placeholder="Ej. Emisiones atmosféricas"
                  value={aspectName}
                  onChange={(e) => setAspectName(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Impacto
                <textarea
                  required
                  className="field mt-2 min-h-20"
                  placeholder="Describe el impacto generado"
                  value={impact}
                  onChange={(e) => setImpact(e.target.value)}
                />
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    ['Severidad', s, setS],
                    ['Frecuencia', f, setF],
                    ['Alcance', a, setA],
                  ] as [string, number, (n: number) => void][]
                ).map((x) => (
                  <label key={x[0]} className="text-xs font-medium">
                    {x[0]}
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={x[1]}
                      onChange={(e) => x[2](Number(e.target.value))}
                      className="field mt-2"
                    />
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#F2F6F1] p-4">
                <div>
                  <p className="text-xs text-[#5B6B5F]">Significancia calculada</p>
                  <p className="mt-1 text-2xl font-semibold">{significance}</p>
                </div>
                <Badge>{significance >= 60 ? 'Alta' : significance >= 27 ? 'Media' : 'Baja'}</Badge>
              </div>
            </>
          )}

          {/* ---- LEGALES ---- */}
          {page === 'legales' && (
            <>
              <label className="block text-sm font-medium">
                Título del requisito
                <input
                  required
                  className="field mt-2"
                  placeholder="Ej. Resolución 0631 de 2015"
                  value={legalTitle}
                  onChange={(e) => setLegalTitle(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Entidad emisora
                <input
                  required
                  className="field mt-2"
                  placeholder="Ej. MinAmbiente"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Aspecto asociado
                <input
                  className="field mt-2"
                  placeholder="Ej. Vertimientos"
                  value={legalAspect}
                  onChange={(e) => setLegalAspect(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Próxima revisión
                <input
                  required
                  type="date"
                  className="field mt-2"
                  value={nextReview}
                  onChange={(e) => setNextReview(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Cumplimiento
                <select
                  className="field mt-2"
                  value={compliance}
                  onChange={(e) => setCompliance(e.target.value)}
                >
                  <option>Cumple</option>
                  <option>No cumple</option>
                  <option>Sin evaluar</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Responsable
                <select
                  className="field mt-2"
                  value={responsibleId}
                  onChange={(e) => setResponsibleId(e.target.value)}
                >
                  <option value="">— Sin asignar —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {/* ---- AUDITORIAS ---- */}
          {page === 'auditorias' && (
            <>
              <label className="block text-sm font-medium">
                Área
                <input
                  required
                  className="field mt-2"
                  placeholder="Ej. Producción"
                  value={audArea}
                  onChange={(e) => setAudArea(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Alcance
                <input
                  required
                  className="field mt-2"
                  placeholder="Ej. Gestión de residuos"
                  value={audScope}
                  onChange={(e) => setAudScope(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Criterios
                <input
                  required
                  className="field mt-2"
                  placeholder="Ej. ISO 14001:2015 §8.1"
                  value={audCriteria}
                  onChange={(e) => setAudCriteria(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Fecha
                <input
                  required
                  type="date"
                  className="field mt-2"
                  value={audDate}
                  onChange={(e) => setAudDate(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Auditor
                <select
                  className="field mt-2"
                  value={auditorId}
                  onChange={(e) => setAuditorId(e.target.value)}
                >
                  <option value="">— Seleccionar —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Estado
                <select
                  className="field mt-2"
                  value={audStatus}
                  onChange={(e) => setAudStatus(e.target.value)}
                >
                  <option>Programada</option>
                  <option>Reprogramada</option>
                  <option>En ejecución</option>
                  <option>Cerrada</option>
                </select>
              </label>
              <div>
                <p className="mb-2 text-sm font-medium">Hallazgos</p>
                {findings.map((fi, idx) => (
                  <div key={idx} className="mb-3 rounded-lg border border-[#E1E8E1] p-3 space-y-2">
                    <input
                      className="field"
                      placeholder="Descripción"
                      value={fi.description}
                      onChange={(e) => {
                        const updated = [...findings]
                        updated[idx] = { ...updated[idx], description: e.target.value }
                        setFindings(updated)
                      }}
                    />
                    <input
                      className="field"
                      placeholder="Criterio"
                      value={fi.criteria}
                      onChange={(e) => {
                        const updated = [...findings]
                        updated[idx] = { ...updated[idx], criteria: e.target.value }
                        setFindings(updated)
                      }}
                    />
                    <select
                      className="field"
                      value={fi.criticality}
                      onChange={(e) => {
                        const updated = [...findings]
                        updated[idx] = { ...updated[idx], criticality: e.target.value }
                        setFindings(updated)
                      }}
                    >
                      <option>Normal</option>
                      <option>Crítica</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={fi.isNonConformity}
                        onChange={(e) => {
                          const updated = [...findings]
                          updated[idx] = { ...updated[idx], isNonConformity: e.target.checked }
                          setFindings(updated)
                        }}
                      />
                      Es no conformidad
                    </label>
                    <button
                      type="button"
                      className="text-xs text-red-600"
                      onClick={() => setFindings(findings.filter((_, i) => i !== idx))}
                    >
                      Eliminar hallazgo
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="secondary-btn text-sm"
                  onClick={() =>
                    setFindings([
                      ...findings,
                      { description: '', criteria: '', criticality: 'Normal', isNonConformity: false, evidenceUrl: '' },
                    ])
                  }
                >
                  <Icon name="plus" size={14} /> Agregar hallazgo
                </button>
              </div>
            </>
          )}

          {/* ---- OBJETIVOS ---- */}
          {page === 'objetivos' && (
            <>
              <label className="block text-sm font-medium">
                Título
                <input
                  required
                  className="field mt-2"
                  placeholder="Ej. Reducir consumo de agua"
                  value={objTitle}
                  onChange={(e) => setObjTitle(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Indicador
                <input
                  required
                  className="field mt-2"
                  placeholder="Ej. m³ consumidos"
                  value={objIndicator}
                  onChange={(e) => setObjIndicator(e.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium">
                  Meta (número)
                  <input
                    required
                    type="number"
                    className="field mt-2"
                    value={objTarget}
                    onChange={(e) => setObjTarget(e.target.value)}
                  />
                </label>
                <label className="text-sm font-medium">
                  Unidad
                  <input
                    required
                    className="field mt-2"
                    placeholder="m³, %, MWh..."
                    value={objUnit}
                    onChange={(e) => setObjUnit(e.target.value)}
                  />
                </label>
              </div>
              <label className="block text-sm font-medium">
                Fecha límite
                <input
                  required
                  type="date"
                  className="field mt-2"
                  value={objDeadline}
                  onChange={(e) => setObjDeadline(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Responsable
                <select
                  className="field mt-2"
                  value={objOwnerId}
                  onChange={(e) => setObjOwnerId(e.target.value)}
                >
                  <option value="">— Seleccionar —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Estado
                <select
                  className="field mt-2"
                  value={objStatus}
                  onChange={(e) => setObjStatus(e.target.value)}
                >
                  <option>Borrador</option>
                  <option>En aprobación</option>
                  <option>Activo</option>
                  <option>Desviado</option>
                  <option>Cumplido</option>
                  <option>Cancelado</option>
                </select>
              </label>
              <div>
                <p className="mb-2 text-sm font-medium">
                  Acciones <span className="text-red-500">*</span>
                </p>
                {objActions.map((act, idx) => (
                  <div key={idx} className="mb-3 rounded-lg border border-[#E1E8E1] p-3 space-y-2">
                    <input
                      className="field"
                      placeholder="Descripción de la acción"
                      value={act.description}
                      onChange={(e) => {
                        const updated = [...objActions]
                        updated[idx] = { ...updated[idx], description: e.target.value }
                        setObjActions(updated)
                      }}
                    />
                    <input
                      className="field"
                      placeholder="Recursos requeridos"
                      value={act.resources}
                      onChange={(e) => {
                        const updated = [...objActions]
                        updated[idx] = { ...updated[idx], resources: e.target.value }
                        setObjActions(updated)
                      }}
                    />
                    <input
                      type="date"
                      className="field"
                      value={act.deadline}
                      onChange={(e) => {
                        const updated = [...objActions]
                        updated[idx] = { ...updated[idx], deadline: e.target.value }
                        setObjActions(updated)
                      }}
                    />
                    <select
                      className="field"
                      value={act.responsible}
                      onChange={(e) => {
                        const updated = [...objActions]
                        updated[idx] = { ...updated[idx], responsible: e.target.value }
                        setObjActions(updated)
                      }}
                    >
                      <option value="">— Responsable —</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                    {objActions.length > 1 && (
                      <button
                        type="button"
                        className="text-xs text-red-600"
                        onClick={() => setObjActions(objActions.filter((_, i) => i !== idx))}
                      >
                        Eliminar acción
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="secondary-btn text-sm"
                  onClick={() =>
                    setObjActions([
                      ...objActions,
                      { description: '', resources: '', deadline: '', responsible: '' },
                    ])
                  }
                >
                  <Icon name="plus" size={14} /> Agregar acción
                </button>
              </div>
            </>
          )}

          {/* ---- INCIDENTES ---- */}
          {page === 'incidentes' && (
            <>
              <label className="block text-sm font-medium">
                Tipo
                <select
                  className="field mt-2"
                  value={incType}
                  onChange={(e) => setIncType(e.target.value)}
                >
                  <option value="incidente">Incidente</option>
                  <option value="emergencia">Emergencia</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Descripción
                <textarea
                  required
                  className="field mt-2 min-h-20"
                  value={incDesc}
                  onChange={(e) => setIncDesc(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Fecha
                <input
                  required
                  type="date"
                  className="field mt-2"
                  value={incDate}
                  onChange={(e) => setIncDate(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Lugar
                <input
                  className="field mt-2"
                  value={incLocation}
                  onChange={(e) => setIncLocation(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Severidad
                <select
                  className="field mt-2"
                  value={incSeverity}
                  onChange={(e) => setIncSeverity(e.target.value)}
                >
                  <option>Baja</option>
                  <option>Media</option>
                  <option>Alta</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Plan de respuesta
                <textarea
                  className="field mt-2 min-h-16"
                  value={incPlan}
                  onChange={(e) => setIncPlan(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Estado
                <select
                  className="field mt-2"
                  value={incStatus}
                  onChange={(e) => setIncStatus(e.target.value)}
                >
                  <option>Abierto</option>
                  <option>En seguimiento</option>
                  <option>Cerrado</option>
                </select>
              </label>
            </>
          )}

          {/* ---- CAPACITACION ---- */}
          {page === 'capacitacion' && (
            <>
              <label className="block text-sm font-medium">
                Tema
                <input
                  required
                  className="field mt-2"
                  value={trainTopic}
                  onChange={(e) => setTrainTopic(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Fecha
                <input
                  required
                  type="date"
                  className="field mt-2"
                  value={trainDate}
                  onChange={(e) => setTrainDate(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Asistente
                <select
                  className="field mt-2"
                  value={trainAttendeeId}
                  onChange={(e) => setTrainAttendeeId(e.target.value)}
                >
                  <option value="">— Seleccionar —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Resultado (0-100)
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="field mt-2"
                  value={trainResult}
                  onChange={(e) => setTrainResult(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Competente
                <select
                  className="field mt-2"
                  value={trainCompetent}
                  onChange={(e) => setTrainCompetent(e.target.value)}
                >
                  <option>Sí</option>
                  <option>No</option>
                </select>
              </label>
            </>
          )}

          {/* ---- EVIDENCIAS ---- */}
          {page === 'evidencias' && (
            <>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                {/* TODO: wire file upload — POST FormData to /api/upload, get mediaId, pass as file field */}
                La carga de archivos se habilitará próximamente. El registro se creará sin archivo adjunto.
              </div>
              <label className="block text-sm font-medium">
                Descripción
                <input
                  required
                  className="field mt-2"
                  value={evidDesc}
                  onChange={(e) => setEvidDesc(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Colección origen
                <input
                  className="field mt-2"
                  placeholder="Ej. legal-requirements"
                  value={evidSource}
                  onChange={(e) => setEvidSource(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                ID de registro
                <input
                  className="field mt-2"
                  value={evidRecordId}
                  onChange={(e) => setEvidRecordId(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Estado de revisión
                <select
                  className="field mt-2"
                  value={evidStatus}
                  onChange={(e) => setEvidStatus(e.target.value)}
                >
                  <option>Pendiente</option>
                  <option>Aprobada</option>
                  <option>Rechazada</option>
                </select>
              </label>
            </>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="secondary-btn">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="primary-btn disabled:opacity-60">
              {isPending ? 'Guardando...' : 'Guardar registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// EcoCertShell
// ---------------------------------------------------------------------------

function EcoCertShell({ onLogout }: { onLogout: () => void }) {
  const { currentUser } = useContext(AppContext)
  const [page, setPage] = useState<PageId>('panel')
  const [menu, setMenu] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [modal, setModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch unread notification count
  useEffect(() => {
    if (!currentUser?.id) return
    getNotifications(currentUser.id).then((res) => {
      const docs = (res.data as unknown[]) ?? []
      setUnreadCount(docs.filter((d: unknown) => !(d as { read?: boolean }).read).length)
    })
  }, [currentUser?.id, page])

  const isAdmin = currentUser?.role === 'administrator'
  const visibleNav = nav.filter((n) => {
    if (n.id === 'usuarios' && !isAdmin) return false
    if (n.id === 'parametros' && !isAdmin) return false
    return true
  })

  const current = nav.find((n) => n.id === page)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const heading =
    page === 'panel'
      ? `${greeting}, ${currentUser?.name?.split(' ')[0] ?? '…'}`
      : current?.label || 'Notificaciones'
  const orgName = currentUser?.organization?.name ?? 'EcoCert 360'
  const roleLabel = roleLabelMap[currentUser?.role ?? ''] ?? currentUser?.role ?? ''
  const sub =
    page === 'panel'
      ? `Aquí tienes el resumen ambiental de ${orgName}.`
      : `${orgName} · ${roleLabel}`

  const tablePages: PageId[] = [
    'aspectos',
    'legales',
    'auditorias',
    'incidentes',
    'capacitacion',
    'evidencias',
    'usuarios',
  ]

  const content = useMemo(() => {
    if (page === 'panel') return <Dashboard go={setPage} />
    if (tablePages.includes(page))
      return (
        <TablePage
          page={page}
          onAdd={() => setModal(true)}
          refreshKey={refreshKey}
        />
      )
    if (page === 'objetivos') return <ObjectivesPage onAdd={() => setModal(true)} />
    if (page === 'conformidades') return <NonConformities />
    if (page === 'reportes') return <Reports />
    if (page === 'parametros') return <Parameters />
    if (page === 'notificaciones') return <NotificationsPage />
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, refreshKey])

  const initials = currentUser ? getInitials(currentUser.name) : '?'

  return (
    <div className="min-h-screen bg-[#F2F6F1] text-[#17251B]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-[#183D27] text-white transition-transform lg:translate-x-0 ${menu ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
          <div className="grid size-10 place-items-center rounded-xl bg-white/12">
            <Icon name="leaf" size={23} />
          </div>
          <div>
            <p className="font-semibold tracking-tight">EcoCert 360</p>
            <p className="text-[10px] uppercase tracking-[.14em] text-white/45">
              Gestión ambiental
            </p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setMenu(false)}>
            <Icon name="close" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {visibleNav.map((n, i) => (
            <button
              key={n.id}
              onClick={() => {
                setPage(n.id)
                setMenu(false)
              }}
              className={`mb-1 flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition ${page === n.id ? 'bg-white text-[#214E31] font-semibold' : 'text-white/67 hover:bg-white/8 hover:text-white'} ${i === 10 ? 'mt-4 before:absolute' : ''}`}
            >
              <Icon name={n.icon as IconName} size={18} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <div className="grid size-9 place-items-center rounded-full bg-[#9DC9A8] text-sm font-bold text-[#173822]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{currentUser?.name ?? '—'}</p>
              <p className="truncate text-xs text-white/45">{roleLabel}</p>
            </div>
            <button
              onClick={onLogout}
              title="Cerrar sesión"
              className="text-white/50 hover:text-white"
            >
              <Icon name="logout" size={17} />
            </button>
          </div>
        </div>
      </aside>
      {menu && (
        <button
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-20 items-center gap-4 border-b border-[#DCE5DC] bg-[#F2F6F1]/92 px-4 backdrop-blur-lg sm:px-7 lg:px-9">
          <button
            onClick={() => setMenu(true)}
            className="grid size-10 place-items-center rounded-lg bg-white shadow-sm lg:hidden"
          >
            <Icon name="menu" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{heading}</h1>
            <p className="truncate text-xs text-[#5B6B5F]">{sub}</p>
          </div>
          <div className="relative hidden md:block">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#758178]">
              <Icon name="search" size={17} />
            </span>
            <input
              className="h-10 w-56 rounded-lg border border-[#D6E0D6] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#2F6B3F]"
              placeholder="Buscar..."
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative grid size-10 place-items-center rounded-lg border border-[#D6E0D6] bg-white"
            >
              <Icon name="bell" size={19} />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#A8321F] ring-2 ring-white" />
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-12 w-[min(340px,calc(100vw-32px))] rounded-xl border border-[#D6E0D6] bg-white p-2 shadow-xl">
                <div className="flex items-center justify-between px-3 py-2">
                  <p className="font-semibold">Notificaciones</p>
                  <button
                    onClick={() => {
                      setPage('notificaciones')
                      setNotificationsOpen(false)
                    }}
                    className="text-xs font-semibold text-[#2F6B3F]"
                  >
                    Ver todas
                  </button>
                </div>
                {unreadCount === 0 ? (
                  <p className="px-3 py-4 text-sm text-[#5B6B5F]">Sin notificaciones nuevas.</p>
                ) : (
                  <p className="px-3 py-2 text-sm text-[#5B6B5F]">
                    Tienes {unreadCount} notificación{unreadCount !== 1 ? 'es' : ''} sin leer.
                  </p>
                )}
              </div>
            )}
          </div>
        </header>
        <main className="p-4 pb-24 sm:p-7 sm:pb-24 lg:p-9">{content}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#CBD8CB] bg-white px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {[
          ['panel', 'Panel', 'grid'],
          ['aspectos', 'Aspectos', 'leaf'],
          ['objetivos', 'Objetivos', 'target'],
          ['auditorias', 'Auditorías', 'clipboard'],
          ['reportes', 'Más', 'menu'],
        ].map((n) => (
          <button
            key={n[0]}
            onClick={() => setPage(n[0] as PageId)}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-medium ${page === n[0] ? 'text-[#2F6B3F]' : 'text-[#6B776D]'}`}
          >
            <Icon name={n[2] as IconName} size={20} />
            {n[1]}
          </button>
        ))}
      </nav>
      {modal && (
        <Modal
          page={page}
          onClose={() => setModal(false)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// EcoCertApp — default export
// ---------------------------------------------------------------------------

export default function EcoCertApp() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)

  // Restore session on mount
  useEffect(() => {
    getCurrentUser().then((res) => {
      if (res.success && res.data) {
        const u = res.data as {
          id: string | number
          name?: string
          email?: string
          role?: string
          organization?: { id: string | number; name?: string } | string | number
        }
        const orgRaw = u.organization
        const org =
          orgRaw && typeof orgRaw === 'object' && 'id' in orgRaw
            ? {
                id: String(orgRaw.id),
                name: (orgRaw as { id: string | number; name?: string }).name ?? '',
              }
            : undefined
        const appUser: AppUser = {
          id: String(u.id),
          name: u.name ?? '',
          email: u.email ?? '',
          role: u.role ?? 'collaborator',
          organization: org,
        }
        setCurrentUser(appUser)
        setLoggedIn(true)
      }
    })
  }, [])

  const organizationId = currentUser?.organization?.id ?? null

  const handleLogin = (user: AppUser) => {
    setCurrentUser(user)
    setLoggedIn(true)
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setLoggedIn(false)
  }

  if (!loggedIn) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <AppContext.Provider value={{ currentUser, organizationId, setCurrentUser }}>
      <EcoCertShell onLogout={handleLogout} />
    </AppContext.Provider>
  )
}
