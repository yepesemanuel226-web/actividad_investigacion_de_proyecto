'use client'

import { useMemo, useState, useEffect, useCallback, useTransition, createContext, useContext } from 'react'
import {
  loginUser,
  registerUser,
  getCurrentUser,
  checkOrgStatus,
  getAspects,
  createAspect,
  getAspectById,
  getLegalRequirements,
  createLegalRequirement,
  updateLegalRequirement,
  getObjectives,
  createObjective,
  updateObjective,
  addObjectiveProgress,
  getObjectiveById,
  getObjectiveProgress,
  getAudits,
  createAudit,
  getAuditById,
  addFindingToAudit,
  updateAudit,
  getNonConformities,
  getNonConformityById,
  updateNonConformity,
  getAuditLogForRecord,
  getIncidents,
  createIncident,
  getTrainings,
  getMyTrainings,
  createTraining,
  getEvidences,
  getMyEvidences,
  createEvidence,
  reviewEvidence,
  getNotifications,
  markNotificationRead,
  getUsers,
  createNotification,
  getParameters,
  saveParameters,
  checkAndApplyAutoTransitions,
  inviteUser,
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
  | 'eye'
  | 'eye-off'

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
    'eye-off': (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    ),
    eye: (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
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

function Skeleton({ inline = false }: { inline?: boolean }) {
  const cls = 'animate-pulse h-5 w-16 rounded bg-gray-200'
  return inline ? (
    <span className={cls + ' inline-block'} />
  ) : (
    <div className={'h-8 ' + cls} />
  )
}

// ---------------------------------------------------------------------------
// Role inference & badge
// ---------------------------------------------------------------------------

type RoleInference = { role: string; label: string; canOverride: boolean }

const PERSONAL_DOMAINS = new Set([
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com',
  'yahoo.es', 'icloud.com', 'live.com', 'msn.com',
])

function inferRole(email: string): RoleInference {
  const domain = email.split('@')[1]?.toLowerCase() ?? ''
  const isPersonal = PERSONAL_DOMAINS.has(domain) || domain.includes('.edu')
  if (isPersonal) return { role: 'collaborator', label: 'Colaborador', canOverride: false }
  return { role: 'environmental_manager', label: 'Resp. ambiental', canOverride: true }
}

const ROLE_BADGE_META: Record<string, { bg: string; label: string }> = {
  administrator:        { bg: 'bg-[#183D27] text-white',      label: 'Administrador' },
  senior_management:    { bg: 'bg-[#1F5F8B] text-white',      label: 'Alta dirección' },
  environmental_manager:{ bg: 'bg-[#2F6B3F] text-white',      label: 'Resp. ambiental' },
  auditor:              { bg: 'bg-[#A86A00] text-white',       label: 'Auditor' },
  collaborator:         { bg: 'bg-[#6B7280] text-white',       label: 'Colaborador' },
  supplier:             { bg: 'bg-[#1F5F8B]/80 text-white',    label: 'Proveedor' },
}

function RoleBadge({ role, size = 'sm' }: { role: string; size?: 'sm' | 'xs' }) {
  const meta = ROLE_BADGE_META[role] ?? ROLE_BADGE_META['collaborator']
  const cls = size === 'xs'
    ? 'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold'
    : 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold'
  return <span className={`${cls} ${meta.bg}`}>{meta.label}</span>
}

// ---------------------------------------------------------------------------
// PasswordField — input de contraseña con toggle ojo
// ---------------------------------------------------------------------------

function PasswordField({
  value,
  onChange,
  placeholder = '••••••••',
  required = false,
  minLength,
  className = 'field mt-2',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  minLength?: number
  className?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative mt-2">
      <input
        type={show ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        className={`${className} pr-10 mt-0`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6B5F] hover:text-[#17251B] transition-colors"
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        <Icon name={show ? 'eye' : 'eye-off'} size={18} />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

function Login({ onLogin }: { onLogin: (user: AppUser) => void }) {
  const [showRegister, setShowRegister] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [nit, setNit] = useState('')
  const [sector, setSector] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('environmental_manager')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  // Política de datos
  const [acceptedPolicy, setAcceptedPolicy] = useState(false)
  const [showPolicy, setShowPolicy] = useState(false)
  // Estado de aprobación pendiente
  const [pendingApproval, setPendingApproval] = useState<{ orgName: string; email: string } | null>(null)
  // Estado de org suspendida
  const [suspended, setSuspended] = useState<{ email: string } | null>(null)

  // Inferir rol desde el dominio del correo cada vez que cambia
  const inferred = inferRole(email)
  useEffect(() => {
    if (showRegister) setRole(inferred.role)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, showRegister])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      let result: { success: boolean; data?: unknown; error?: string }
      if (showRegister) {
        result = await registerUser({ orgName, nit, sector, name, email, password, role })
      } else {
        result = await loginUser(email, password)
        // Login bloqueado porque la org está pendiente
        if (!result.success && result.error === 'pending') {
          const d = result.data as { orgName: string } | undefined
          setPendingApproval({ orgName: d?.orgName ?? '', email })
          return
        }
        // Login bloqueado porque la org está suspendida
        if (!result.success && result.error?.includes('suspendida')) {
          setSuspended({ email })
          return
        }
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
        // orgRaw puede ser un objeto {id,name} o directamente un número/string (el ID)
        const org = orgRaw
          ? typeof orgRaw === 'object' && 'id' in orgRaw
            ? { id: String((orgRaw as { id: string | number }).id), name: (orgRaw as { id: string | number; name?: string }).name ?? '' }
            : { id: String(orgRaw), name: '' }
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

  // ── Pantalla: organización suspendida ─────────────────────────────────
  if (suspended) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F2F6F1] p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#2F6B3F] text-white">
              <Icon name="leaf" />
            </div>
            <span className="text-xl font-semibold">EcoCert 360</span>
          </div>
          <div className="card p-8 text-center">
            <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-[#F8DAD4]">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#A8321F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-[#17251B]">Organización suspendida</h2>
            <p className="mt-3 text-[#5B6B5F] leading-6">
              La cuenta <strong className="text-[#17251B]">{suspended.email}</strong> pertenece a una organización que ha sido suspendida y no puede acceder a la plataforma.
            </p>
            <div className="mt-5 rounded-lg bg-[#F8DAD4] px-4 py-3 text-sm text-[#A8321F]">
              Para reactivar tu organización, contacta al equipo de soporte de EcoCert 360.
            </div>
            <button
              className="mt-6 w-full text-center text-sm font-medium text-[#2F6B3F]"
              onClick={() => { setSuspended(null); setEmail(''); setPassword(''); setError('') }}
            >
              ← Volver al inicio de sesión
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ── Pantalla recuperar contraseña ──────────────────────────────────────
  if (showForgot) {
    const handleForgot = (e: React.FormEvent) => {
      e.preventDefault()
      // Payload expone POST /api/users/forgot-password
      fetch('/api/users/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
        .then((res) => {
          // Siempre mostrar éxito (404 incluido) para no revelar si el correo existe
          if (res.ok || res.status === 404) {
            setForgotSent(true)
          } else {
            setError('No se pudo enviar el correo. Intenta de nuevo.')
          }
        })
        .catch(() => setError('Error de red. Verifica tu conexión e intenta de nuevo.'))
    }
    return (
      <main className="grid min-h-screen place-items-center bg-[#F2F6F1] p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#2F6B3F] text-white">
              <Icon name="leaf" />
            </div>
            <span className="text-xl font-semibold">EcoCert 360</span>
          </div>
          {forgotSent ? (
            <div className="card p-8 text-center">
              <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-[#DDEBDD] text-[#2F6B3F]">
                <Icon name="check" size={28} />
              </div>
              <h2 className="text-2xl font-semibold">Revisa tu correo</h2>
              <p className="mt-3 text-[#5B6B5F]">
                Si existe una cuenta con <strong>{forgotEmail}</strong>, recibirás un enlace para
                restablecer tu contraseña.
              </p>
              <button
                className="primary-btn mt-8 w-full justify-center"
                onClick={() => { setShowForgot(false); setForgotSent(false) }}
              >
                Volver al inicio de sesión
              </button>
            </div>
          ) : (
            <div className="card p-8">
              <h2 className="text-2xl font-semibold">Recuperar contraseña</h2>
              <p className="mt-2 text-sm text-[#5B6B5F]">
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
              </p>
              <form className="mt-6 space-y-4" onSubmit={handleForgot}>
                <label className="block text-sm font-medium">
                  Correo electrónico
                  <input
                    required
                    type="email"
                    className="field mt-2"
                    placeholder="nombre@empresa.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </label>
                <button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2F6B3F] font-semibold text-white transition hover:bg-[#245431]">
                  Enviar enlace <Icon name="arrow" size={17} />
                </button>
              </form>
              <button
                className="mt-5 w-full text-center text-sm font-medium text-[#2F6B3F]"
                onClick={() => setShowForgot(false)}
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          )}
        </div>
      </main>
    )
  }

  return (
  <>
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
                {/* Campo de correo primero — el indicador de rol aparece al escribir */}
                <div>
                  <label className="block text-sm font-medium">
                    Correo electrónico
                    <input
                      required
                      type="email"
                      className="field mt-2"
                      placeholder="nombre@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                    />
                  </label>

                  {/* Indicador dinámico según el dominio */}
                  {!email.includes('@') ? (
                    /* Hint inicial: tipos de correo */
                    <div className="mt-2 rounded-lg border border-dashed border-[#CBD8CB] bg-white px-3 py-2.5">
                      <p className="text-xs font-medium text-[#5B6B5F] mb-1.5">¿Qué correo usar?</p>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-[#5B6B5F]">
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-[#2F6B3F] shrink-0" />
                          <span><strong>@empresa.com / .co</strong> → crea organización</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-[#A86A00] shrink-0" />
                          <span><strong>@gmail / @hotmail / @outlook</strong> → solo por invitación</span>
                        </div>
                      </div>
                    </div>
                  ) : !inferred.canOverride ? (
                    /* Correo personal — bloquear */
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4M12 17h.01"/></svg>
                        <span className="text-xs font-semibold text-amber-800">Correo personal · Solo por invitación</span>
                      </div>
                      <p className="text-[11px] text-amber-700 leading-4">
                        Con <strong>@gmail, @hotmail, @outlook</strong> y similares no puedes crear una organización nueva. Pide a tu administrador que te invite, o usa el correo corporativo de tu empresa.
                      </p>
                    </div>
                  ) : (
                    /* Correo corporativo — mostrar rol asignado */
                    <div className="mt-2 rounded-lg border border-[#DDEBDD] bg-[#F4FAF4] px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2F6B3F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6"/></svg>
                          <span className="text-xs font-semibold text-[#2F6B3F]">Correo corporativo detectado</span>
                        </div>
                        <RoleBadge role="environmental_manager" />
                      </div>
                      <p className="mt-1 text-[11px] text-[#5B6B5F] leading-4">
                        Serás <strong>Responsable Ambiental</strong> de tu organización. Los roles Administrador y Alta Dirección se asignan desde el panel de administración.
                      </p>
                    </div>
                  )}
                </div>

                {/* Resto del formulario solo para correos corporativos */}
                {email.includes('@') && inferred.canOverride && (
                  <>
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
                    <label className="block text-sm font-medium">
                      Contraseña
                      <PasswordField
                        required
                        placeholder="Mínimo 8 caracteres"
                        value={password}
                        onChange={setPassword}
                        minLength={8}
                      />
                    </label>
                    <div className="rounded-lg border border-[#CBD8CB] bg-[#F8FAF8] p-4 space-y-4">
                      <p className="text-sm font-semibold text-[#17251B]">Datos de tu organización</p>
                      <label className="block text-sm font-medium">
                        Nombre de la organización
                        <input
                          required
                          className="field mt-2"
                          placeholder="EcoVerde S.A.S."
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-3">
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
                    </div>
                  </>
                )}
              </>
            )}
            {!showRegister && (
              <>
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
                  <PasswordField
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={setPassword}
                  />
                </label>
              </>
            )}
            {!showRegister && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-[#5B6B5F]">
                  <input type="checkbox" className="accent-[#2F6B3F]" /> Recordarme
                </label>
                <button
                  type="button"
                  className="font-medium text-[#2F6B3F]"
                  onClick={() => { setShowForgot(true); setError('') }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
            {showRegister && email.includes('@') && inferred.canOverride && (
              <div className="flex items-start gap-3">
                <input
                  id="policy-cb"
                  type="checkbox"
                  className="mt-0.5 accent-[#2F6B3F] shrink-0 size-4"
                  checked={acceptedPolicy}
                  onChange={(e) => setAcceptedPolicy(e.target.checked)}
                />
                <label htmlFor="policy-cb" className="text-sm text-[#5B6B5F] leading-5 cursor-pointer">
                  He leído y acepto la{' '}
                  <button
                    type="button"
                    className="font-semibold text-[#2F6B3F] underline"
                    onClick={() => setShowPolicy(true)}
                  >
                    política de tratamiento de datos personales
                  </button>
                  .
                </label>
              </div>
            )}
            <button
              type="submit"
              disabled={
                isPending ||
                (showRegister && email.includes('@') && !inferred.canOverride) ||
                (showRegister && email.includes('@') && inferred.canOverride && !acceptedPolicy)
              }
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
              onClick={() => { setShowRegister(!showRegister); setAcceptedPolicy(false); setError('') }}
            >
              {showRegister ? 'Inicia sesión' : 'Regístrate'}
            </button>
          </p>

        </div>
      </section>
    </main>

    {/* Modal política de datos */}
    {showPolicy && (
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-[#122117]/55 p-4 backdrop-blur-sm"
        onMouseDown={() => setShowPolicy(false)}
      >
        <div
          className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-xl bg-white shadow-2xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 flex items-center justify-between border-b border-[#E1E8E1] bg-white p-6">
            <h2 className="text-lg font-semibold">Política de tratamiento de datos personales</h2>
            <button
              type="button"
              onClick={() => setShowPolicy(false)}
              className="grid size-8 place-items-center rounded-lg hover:bg-[#EDF2ED] text-[#5B6B5F]"
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="space-y-4 p-6 text-sm text-[#5B6B5F] leading-6">
            <p>
              En cumplimiento de la <strong className="text-[#17251B]">Ley 1581 de 2012</strong> y el
              Decreto 1377 de 2013, <strong className="text-[#17251B]">EcoCert 360</strong> informa
              que los datos personales suministrados durante el registro serán tratados exclusivamente
              para gestionar la cuenta de usuario, brindar los servicios de la plataforma y cumplir
              con obligaciones legales.
            </p>
            <p>
              Los datos recopilados incluyen nombre, correo electrónico, NIT de la organización y
              sector económico. No serán cedidos a terceros sin su consentimiento previo, salvo
              obligación legal.
            </p>
            <p>
              Tienes derecho a conocer, actualizar, rectificar y suprimir tus datos personales.
              Para ejercer estos derechos, escribe a{' '}
              <strong className="text-[#17251B]">datos@ecocert360.co</strong>.
            </p>
            <p>
              Los datos se almacenan en servidores seguros con cifrado en tránsito y en reposo.
              Al desactivar la cuenta, se eliminan en un plazo de 30 días hábiles.
            </p>
          </div>
          <div className="border-t border-[#E1E8E1] p-6">
            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2F6B3F] font-semibold text-white transition hover:bg-[#245431]"
              onClick={() => { setAcceptedPolicy(true); setShowPolicy(false) }}
            >
              <Icon name="check" size={17} />
              Acepto la política
            </button>
          </div>
        </div>
      </div>
    )}
  </>
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
  const [ncByStatus, setNcByStatus] = useState<Record<string, number>>({})
  const [expiringCount, setExpiringCount] = useState(0)
  const [legalStats, setLegalStats] = useState({ cumple: 0, noCumple: 0, sinEvaluar: 0, total: 0 })
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
        // Conteo por estado para el gráfico del Dashboard
        const counts: Record<string, number> = {}
        ncDocs.forEach((d: unknown) => {
          const s = (d as { status?: string }).status ?? 'Desconocido'
          counts[s] = (counts[s] ?? 0) + 1
        })
        setNcByStatus(counts)

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
        const cumple = legalDocs.filter((d: unknown) => (d as { compliance?: string }).compliance === 'Cumple').length
        const noCumple = legalDocs.filter((d: unknown) => (d as { compliance?: string }).compliance === 'No cumple').length
        const sinEvaluar = legalDocs.filter((d: unknown) => (d as { compliance?: string }).compliance === 'Sin evaluar').length
        setLegalStats({ cumple, noCumple, sinEvaluar, total: legalDocs.length })

        const notifDocs = (notifsRes.data as unknown[]) ?? []
        setUnreadCount(notifDocs.filter((d: unknown) => !(d as { read?: boolean }).read).length)

        // RN-07, RN-10, RN-03: aplicar transiciones automáticas en background
        checkAndApplyAutoTransitions(orgId).catch(() => {})
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
              {k.value === null ? <Skeleton inline /> : k.value}
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
            {Object.keys(ncByStatus).length === 0 ? (
              <p className="py-6 text-sm text-[#5B6B5F]">Sin datos aún.</p>
            ) : (
              (['Detectada', 'En análisis', 'En ejecución', 'Vencida', 'Escalada'] as const)
                .filter(s => ncByStatus[s])
                .map(s => {
                  const count = ncByStatus[s] ?? 0
                  const maxCount = Math.max(...Object.values(ncByStatus))
                  const heightPx = Math.round((count / maxCount) * 60) + 10
                  const colors: Record<string, string> = {
                    Detectada: '#DCA444', 'En análisis': '#5A8DB2',
                    'En ejecución': '#2F6B3F', Vencida: '#B94B39', Escalada: '#B94B39',
                  }
                  return (
                    <div key={s} className="flex flex-1 flex-col items-center gap-2">
                      <span className="text-xs font-semibold">{count}</span>
                      <div className="w-full max-w-11 rounded-t-md" style={{ height: heightPx, backgroundColor: colors[s] }} />
                      <span className="text-[10px] text-[#5B6B5F]">{s.replace('En ', '')}</span>
                    </div>
                  )
                })
            )}
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
            <span className="text-sm font-semibold text-[#2F6B3F]">
              {legalStats.total > 0 ? `${Math.round((legalStats.cumple / legalStats.total) * 100)}%` : '—'}
            </span>
          </div>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-[#ECEFF1]">
            <div
              className="h-full bg-[#2F6B3F] rounded-full transition-all"
              style={{ width: legalStats.total > 0 ? `${Math.round((legalStats.cumple / legalStats.total) * 100)}%` : '0%' }}
            />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-semibold">{legalStats.cumple}</p>
              <p className="text-xs text-[#5B6B5F]">Cumplen</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-[#A8321F]">{legalStats.noCumple}</p>
              <p className="text-xs text-[#5B6B5F]">No cumplen</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-[#6B7280]">{legalStats.sinEvaluar}</p>
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

// ---------------------------------------------------------------------------
// EmptyState — estado vacío reutilizable con ícono, texto y botón de acción
// ---------------------------------------------------------------------------

function EmptyState({
  icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: IconName
  title: string
  description: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-full bg-[#F2F6F1] text-[#5B6B5F]">
        <Icon name={icon} size={28} />
      </div>
      <h3 className="text-base font-semibold text-[#17251B]">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-[#5B6B5F]">{description}</p>
      {action && onAction && (
        <button onClick={onAction} className="primary-btn mt-5">
          <Icon name="plus" size={16} />
          {action}
        </button>
      )}
    </div>
  )
}

function TablePage({
  page,
  onAdd,
  refreshKey,
  onRowClick,
}: {
  page: PageId
  onAdd: () => void
  refreshKey?: number
  onRowClick?: (id: string) => void
}) {
  const { currentUser, organizationId } = useContext(AppContext)
  const [rows, setRows] = useState<string[][]>([])
  const [rowIds, setRowIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')

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
        setRowIds(((res.data as unknown[]) ?? []).map((d: unknown) => String((d as { id?: string | number }).id ?? '')))
      } else if (page === 'legales') {
        const res = await getLegalRequirements(organizationId)
        const docs = (res.data as unknown[]) ?? []
        setRows(
          docs.map((d: unknown) => {
            const doc = d as {
              title?: string
              issuer?: string
              aspect?: { name?: string } | string | number | null
              nextReview?: string
              compliance?: string
            }
            // aspect puede llegar como objeto {id, name} o string — extraer el nombre
            const aspectName = doc.aspect
              ? typeof doc.aspect === 'object' && 'name' in doc.aspect
                ? (doc.aspect as { name?: string }).name ?? '—'
                : String(doc.aspect)
              : '—'
            return [
              doc.title ?? '—',
              doc.issuer ?? '—',
              aspectName,
              formatDate(doc.nextReview),
              doc.compliance ?? 'Sin evaluar',
            ]
          }),
        )
        setRowIds(((res.data as unknown[]) ?? []).map((d: unknown) => String((d as { id?: string | number }).id ?? '')))
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
        setRowIds(((res.data as unknown[]) ?? []).map((d: unknown) => String((d as { id?: string | number }).id ?? '')))
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
        // P21: Colaborador solo ve sus propias capacitaciones
        const isCollaborator = currentUser?.role === 'collaborator'
        const res = isCollaborator && currentUser?.id
          ? await getMyTrainings(organizationId, currentUser.id)
          : await getTrainings(organizationId)
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
        // P22: Proveedor solo ve las suyas; Resp. Ambiental/Auditor ven todas
        const isSupplier = currentUser?.role === 'supplier'
        const res = isSupplier && currentUser?.id
          ? await getMyEvidences(organizationId, currentUser.id)
          : await getEvidences(organizationId)
        const docs = (res.data as unknown[]) ?? []
        const ids = docs.map((d: unknown) => String((d as { id?: string | number }).id ?? ''))
        setRowIds(ids)
        setRows(
          docs.map((d: unknown) => {
            const doc = d as {
              id?: string | number
              description?: string
              sourceTable?: string
              recordId?: string
              statusReview?: string
              uploadedBy?: { name?: string } | string
            }
            const uploaderName = typeof doc.uploadedBy === 'object' && doc.uploadedBy !== null
              ? (doc.uploadedBy as { name?: string }).name ?? '—'
              : String(doc.uploadedBy ?? '—')
            return [
              doc.description ?? '—',
              uploaderName,
              doc.sourceTable ?? '—',
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
      desc: currentUser?.role === 'supplier' ? 'Tus evidencias enviadas.' : 'Centraliza soportes de proveedores y requisitos.',
      button: 'Cargar evidencia',
      headers: ['Descripción', 'Subido por', 'Módulo', 'Fecha', 'Estado'],
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

  // Config de empty states por sección
  const emptyStates: Record<string, { icon: IconName; title: string; description: string }> = {
    aspectos:     { icon: 'leaf',      title: 'Sin aspectos registrados',      description: 'Registra las actividades y aspectos ambientales de tu organización para calcular su significancia.' },
    legales:      { icon: 'scale',     title: 'Sin requisitos legales',         description: 'Agrega los requisitos legales aplicables a tu organización y controla su cumplimiento.' },
    auditorias:   { icon: 'clipboard', title: 'Sin auditorías programadas',     description: 'Programa auditorías para evaluar el sistema de gestión ambiental.' },
    incidentes:   { icon: 'alert',     title: 'Sin incidentes registrados',     description: 'Reporta incidentes y emergencias ambientales para darles seguimiento.' },
    capacitacion: { icon: 'training',  title: 'Sin capacitaciones registradas', description: 'Registra las capacitaciones del equipo y evalúa su competencia ambiental.' },
    evidencias:   { icon: 'file',      title: 'Sin evidencias cargadas',        description: 'Carga evidencias de cumplimiento de proveedores y requisitos.' },
    usuarios:     { icon: 'users',     title: 'Sin usuarios registrados',       description: 'Invita usuarios a tu organización y asígnales roles según sus responsabilidades.' },
  }
  const emptyState = emptyStates[page]

  // ── Filtrado client-side ──────────────────────────────────────────────
  const q = searchQuery.trim().toLowerCase()
  const filteredPairs = c.rows
    .map((row, i) => ({ row, id: rowIds[i] ?? '', idx: i }))
    .filter(({ row }) => {
      // Filtro de texto: cualquier celda contiene el query
      const matchesText = !q || row.some((cell) => cell.toLowerCase().includes(q))
      // Filtro de estado: última columna
      const lastCell = row[row.length - 1] ?? ''
      const matchesStatus = statusFilter === 'Todos' || lastCell === statusFilter
      return matchesText && matchesStatus
    })
  const filteredRows = filteredPairs.map((p) => p.row)
  const filteredIds = filteredPairs.map((p) => p.id)

  // Opciones únicas de estado para el selector
  const statusOptions = ['Todos', ...Array.from(new Set(c.rows.map((r) => r[r.length - 1]).filter(Boolean)))]

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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-lg border border-[#CBD8CB] bg-white px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>{opt === 'Todos' ? 'Todos los estados' : opt}</option>
            ))}
          </select>
          {filteredRows.length > 0 && (
            <button
              onClick={() => {
                const csvRows = [c.headers, ...filteredRows]
                const csv = csvRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
                const a = document.createElement('a')
                a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
                a.download = `${c.title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,10)}.csv`
                a.click()
              }}
              className="secondary-btn shrink-0"
            >
              <Icon name="download" size={16} />
              CSV
            </button>
          )}
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
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={c.headers.length + 1}>
                        {q || statusFilter !== 'Todos' ? (
                          <p className="px-5 py-8 text-center text-sm text-[#5B6B5F]">
                            Sin resultados para esta búsqueda.
                          </p>
                        ) : emptyState ? (
                          <EmptyState
                            icon={emptyState.icon}
                            title={emptyState.title}
                            description={emptyState.description}
                            action={showAddButton ? c.button : undefined}
                            onAction={showAddButton ? onAdd : undefined}
                          />
                        ) : (
                          <p className="px-5 py-8 text-center text-sm text-[#5B6B5F]">Sin registros.</p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, i) => (
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
                          <div className="flex items-center gap-1">
                            {/* P10: Auditor evalúa cumplimiento (RN-04) */}
                            {page === 'legales' &&
                              (currentUser?.role === 'auditor' || currentUser?.role === 'administrator') &&
                              row[row.length - 1] !== 'Cumple' && (
                              <>
                                <button
                                  onClick={() => {
                                    updateLegalRequirement(filteredIds[i] ?? '', { compliance: 'Cumple' }).then(() => fetchRows())
                                  }}
                                  className="rounded px-2 py-1 text-xs font-medium text-[#2F6B3F] hover:bg-[#DDEBDD]"
                                >Cumple</button>
                                {row[row.length - 1] !== 'No cumple' && (
                                  <button
                                    onClick={() => {
                                      updateLegalRequirement(filteredIds[i] ?? '', { compliance: 'No cumple' }).then(() => fetchRows())
                                    }}
                                    className="rounded px-2 py-1 text-xs font-medium text-[#A8321F] hover:bg-[#F8DAD4]"
                                  >No cumple</button>
                                )}
                              </>
                            )}
                            {/* P22: Resp. Ambiental aprueba/rechaza evidencias */}
                            {page === 'evidencias' &&
                              (currentUser?.role === 'environmental_manager' || currentUser?.role === 'administrator') &&
                              row[row.length - 1] === 'Pendiente' && (
                              <>
                                <button
                                  onClick={() => { reviewEvidence(filteredIds[i] ?? '', 'Aprobada').then(() => fetchRows()) }}
                                  className="rounded px-2 py-1 text-xs font-medium text-[#2F6B3F] hover:bg-[#DDEBDD]"
                                >Aprobar</button>
                                <button
                                  onClick={() => { reviewEvidence(filteredIds[i] ?? '', 'Rechazada').then(() => fetchRows()) }}
                                  className="rounded px-2 py-1 text-xs font-medium text-[#A8321F] hover:bg-[#F8DAD4]"
                                >Rechazar</button>
                              </>
                            )}
                            <button
                              onClick={() => onRowClick?.(filteredIds[i] ?? '')}
                              className="grid size-8 place-items-center rounded hover:bg-[#E7EEE7]"
                            >
                              <Icon name="arrow" size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-[#E5EBE5] md:hidden">
              {filteredRows.length === 0 ? (
                <div className="p-4">
                  {q || statusFilter !== 'Todos' ? (
                    <p className="py-6 text-center text-sm text-[#5B6B5F]">Sin resultados para esta búsqueda.</p>
                  ) : emptyState ? (
                    <EmptyState
                      icon={emptyState.icon}
                      title={emptyState.title}
                      description={emptyState.description}
                      action={showAddButton ? c.button : undefined}
                      onAction={showAddButton ? onAdd : undefined}
                    />
                  ) : (
                    <p className="py-6 text-center text-sm text-[#5B6B5F]">Sin registros.</p>
                  )}
                </div>
              ) : filteredRows.map((row, i) => (
                <button key={i} onClick={() => onRowClick?.(filteredIds[i] ?? '')} className="block w-full p-4 text-left">
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
// Objective Detail (P13)
// ---------------------------------------------------------------------------

type ObjDoc = {
  id: string | number
  title?: string
  indicator?: string
  target?: number
  currentValue?: number
  unit?: string
  deadline?: string
  status?: string
  owner?: { id?: string | number; name?: string } | string | number
  actions?: { id?: string; description?: string; responsible?: { name?: string } | string; resources?: string; deadline?: string; completed?: boolean }[]
}

function ObjectiveDetail({ objId, onBack }: { objId: string; onBack: () => void }) {
  const { currentUser } = useContext(AppContext)
  const [obj, setObj] = useState<ObjDoc | null>(null)
  const [progressLogs, setProgressLogs] = useState<{ date?: string; value?: number; comment?: string; user?: { name?: string } | string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showProgressForm, setShowProgressForm] = useState(false)
  const [progressValue, setProgressValue] = useState('')
  const [progressComment, setProgressComment] = useState('')
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')

  const refresh = () => {
    setLoading(true)
    Promise.all([getObjectiveById(objId), getObjectiveProgress(objId)]).then(([oRes, pRes]) => {
      if (oRes.success) setObj(oRes.data as ObjDoc)
      if (pRes.success) setProgressLogs((pRes.data as unknown[]).map((d: unknown) => d as { date?: string; value?: number; comment?: string; user?: { name?: string } | string }))
      setLoading(false)
    })
  }

  useEffect(() => { refresh() }, [objId])

  const role = currentUser?.role ?? ''
  const status = obj?.status ?? ''
  const progress = obj?.target && obj.target > 0 ? Math.min(100, Math.round(((obj.currentValue ?? 0) / obj.target) * 100)) : 0
  const ownerName = typeof obj?.owner === 'object' && obj?.owner !== null ? (obj.owner as { name?: string }).name ?? '—' : '—'

  const transition = (newStatus: string, extraData?: Record<string, unknown>) => {
    startTransition(async () => {
      const res = await updateObjective(objId, { status: newStatus, ...extraData })
      if (res.success) { setToast('Estado actualizado'); refresh() }
      else setToast(res.error ?? 'Error')
      setTimeout(() => setToast(''), 3000)
    })
  }

  const submitProgress = () => {
    if (!progressValue) return
    startTransition(async () => {
      const val = Number(progressValue)
      const res = await addObjectiveProgress({ objectiveId: objId, value: val, comment: progressComment })
      if (res.success) {
        // Auto-cumplido si alcanza la meta
        if (obj?.target && val >= obj.target) transition('Cumplido')
        else { setToast('Avance registrado'); refresh() }
        setShowProgressForm(false)
        setProgressValue(''); setProgressComment('')
      } else setToast(res.error ?? 'Error')
      setTimeout(() => setToast(''), 3000)
    })
  }

  if (loading) return <div className="mt-8 space-y-4">{[1,2,3].map(i => <div key={i} className="card animate-pulse h-24" />)}</div>
  if (!obj) return <p className="mt-6 text-sm text-[#5B6B5F]">No se encontró el objetivo.</p>

  return (
    <div>
      {/* Toast */}
      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#2F6B3F] px-5 py-3 text-sm font-medium text-white shadow-lg">{toast}</div>}

      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-[#2F6B3F]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{transform:'rotate(180deg)'}} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
          Volver
        </button>
        <span className="text-[#CBD8CB]">/</span>
        <span className="text-sm text-[#5B6B5F] truncate">{obj.title}</span>
      </div>

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{obj.title}</h2>
            <p className="mt-1 text-sm text-[#5B6B5F]">Indicador: {obj.indicator} · Responsable: {ownerName}</p>
          </div>
          <Badge>{status}</Badge>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
          <div><p className="text-[#5B6B5F] text-xs">Meta</p><p className="font-semibold mt-0.5">{obj.target} {obj.unit}</p></div>
          <div><p className="text-[#5B6B5F] text-xs">Valor actual</p><p className="font-semibold mt-0.5">{obj.currentValue ?? 0} {obj.unit}</p></div>
          <div><p className="text-[#5B6B5F] text-xs">Avance</p><p className="font-semibold mt-0.5">{progress}%</p></div>
          <div><p className="text-[#5B6B5F] text-xs">Fecha límite</p><p className="font-semibold mt-0.5">{formatDate(obj.deadline)}</p></div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#E6ECE6]">
          <div className={`h-full rounded-full transition-all ${status === 'Desviado' ? 'bg-[#A86A00]' : status === 'Cumplido' ? 'bg-[#2F6B3F]' : 'bg-[#2F6B3F]'}`} style={{ width: `${progress}%` }} />
        </div>

        {/* Botones de transición */}
        <div className="mt-5 flex flex-wrap gap-3 pt-4 border-t border-[#E5EBE5]">
          {role === 'environmental_manager' && status === 'Borrador' && (
            <button onClick={() => transition('En aprobación')} disabled={isPending} className="primary-btn disabled:opacity-60">Enviar a aprobación</button>
          )}
          {(role === 'senior_management' || role === 'administrator') && status === 'En aprobación' && (<>
            <button onClick={() => transition('Activo')} disabled={isPending} className="primary-btn disabled:opacity-60">Aprobar</button>
            <button onClick={() => transition('Borrador')} disabled={isPending} className="secondary-btn disabled:opacity-60">Pedir ajustes</button>
          </>)}
          {role === 'environmental_manager' && status === 'Activo' && (
            <button onClick={() => setShowProgressForm(true)} className="primary-btn">Registrar avance</button>
          )}
          {role === 'environmental_manager' && status === 'Desviado' && (
            <button onClick={() => transition('En aprobación')} disabled={isPending} className="secondary-btn disabled:opacity-60">Reprogramar plan</button>
          )}
        </div>

        {/* Mini formulario de avance */}
        {showProgressForm && (
          <div className="mt-4 rounded-lg border border-[#CBD8CB] bg-[#F8FAF8] p-4 space-y-3">
            <p className="text-sm font-medium">Registrar avance</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-medium">Valor actual<input type="number" className="field mt-1" value={progressValue} onChange={e => setProgressValue(e.target.value)} placeholder={`Ej. ${(obj.currentValue ?? 0) + 1}`} /></label>
              <label className="text-xs font-medium">Comentario<input className="field mt-1" value={progressComment} onChange={e => setProgressComment(e.target.value)} placeholder="Opcional" /></label>
            </div>
            <div className="flex gap-2">
              <button onClick={submitProgress} disabled={isPending} className="primary-btn text-sm disabled:opacity-60">Guardar</button>
              <button onClick={() => setShowProgressForm(false)} className="secondary-btn text-sm">Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* Plan de acción */}
      {(obj.actions ?? []).length > 0 && (
        <section className="card mt-5 p-6">
          <h3 className="section-title mb-4">Plan de acción</h3>
          <div className="space-y-3">
            {(obj.actions ?? []).map((a, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-lg p-3 ${a.completed ? 'bg-[#F4FAF4]' : 'bg-[#F8FAF8]'}`}>
                <span className={`mt-0.5 size-5 shrink-0 rounded-full grid place-items-center text-[10px] font-bold ${a.completed ? 'bg-[#2F6B3F] text-white' : 'bg-[#ECEFF1] text-[#6B7280]'}`}>
                  {a.completed ? '✓' : i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.description}</p>
                  <p className="text-xs text-[#5B6B5F] mt-0.5">Recursos: {a.resources} · Plazo: {formatDate(a.deadline)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Historial de avances */}
      <section className="card mt-5 p-6">
        <h3 className="section-title mb-4">Historial de avances</h3>
        {progressLogs.length === 0 ? (
          <p className="text-sm text-[#5B6B5F]">Sin avances registrados aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[#5B6B5F] border-b border-[#E5EBE5]">
                <tr><th className="pb-2 pr-4">Fecha</th><th className="pb-2 pr-4">Valor</th><th className="pb-2">Comentario</th></tr>
              </thead>
              <tbody>
                {progressLogs.map((p, i) => (
                  <tr key={i} className="border-b border-[#F2F6F1]">
                    <td className="py-2 pr-4 text-[#5B6B5F]">{formatDate(p.date)}</td>
                    <td className="py-2 pr-4 font-semibold">{p.value} {obj.unit}</td>
                    <td className="py-2 text-[#5B6B5F]">{p.comment ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Non-conformity Detail (P18)
// ---------------------------------------------------------------------------

type NCDoc = {
  id: string | number
  code?: string
  description?: string
  status?: string
  criticality?: string
  origin?: string
  rootCause?: string
  deadline?: string
  owner?: { name?: string } | string
  correctiveAction?: { description?: string; responsible?: { name?: string } | string; resources?: string; deadline?: string; effective?: string }
  createdAt?: string
  closedAt?: string
}

type AuditLogEntry = { id?: string | number; action?: string; detail?: string; date?: string; user?: { name?: string } | string }

function NonConformityDetail({ ncId, onBack }: { ncId: string; onBack: () => void }) {
  const { currentUser } = useContext(AppContext)
  const [nc, setNc] = useState<NCDoc | null>(null)
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')

  const refresh = () => {
    setLoading(true)
    Promise.all([getNonConformityById(ncId), getAuditLogForRecord('non-conformities', ncId)]).then(([nRes, lRes]) => {
      if (nRes.success) setNc(nRes.data as NCDoc)
      if (lRes.success) setLogs((lRes.data as unknown[]).map(d => d as AuditLogEntry))
      setLoading(false)
    })
  }

  useEffect(() => { refresh() }, [ncId])

  const role = currentUser?.role ?? ''
  const status = nc?.status ?? ''

  const transition = (newStatus: string) => {
    startTransition(async () => {
      const res = await updateNonConformity(ncId, { status: newStatus })
      if (res.success) { setToast('Estado actualizado'); refresh() }
      else setToast(res.error ?? 'Error')
      setTimeout(() => setToast(''), 3000)
    })
  }

  const statusColors: Record<string, string> = {
    Detectada: '#A86A00', Escalada: '#A8321F', 'En análisis': '#1F5F8B',
    'En ejecución': '#1F5F8B', Vencida: '#A8321F', 'En verificación': '#1F5F8B', Cerrada: '#2F6B3F',
  }
  const statusOrder = ['Detectada', 'Escalada', 'En análisis', 'En ejecución', 'En verificación', 'Cerrada']

  if (loading) return <div className="mt-8 space-y-4">{[1,2,3].map(i => <div key={i} className="card animate-pulse h-24" />)}</div>
  if (!nc) return <p className="mt-6 text-sm text-[#5B6B5F]">No se encontró la no conformidad.</p>

  return (
    <div>
      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#2F6B3F] px-5 py-3 text-sm font-medium text-white shadow-lg">{toast}</div>}

      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-[#2F6B3F]">
          <Icon name="arrow" size={16} /> Volver
        </button>
        <span className="text-[#CBD8CB]">/</span>
        <span className="text-sm text-[#5B6B5F]">{nc.code}</span>
      </div>

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold">{nc.code}</span>
              <Badge>{nc.criticality === 'Crítica' ? 'Alta' : 'Media'}</Badge>
            </div>
            <p className="text-sm text-[#5B6B5F]">Origen: {nc.origin} · Creada: {formatDate(nc.createdAt)}</p>
          </div>
          <Badge>{status}</Badge>
        </div>
        <p className="mt-4 text-sm leading-6">{nc.description}</p>

        {/* Botones por rol y estado */}
        <div className="mt-5 flex flex-wrap gap-3 pt-4 border-t border-[#E5EBE5]">
          {role === 'environmental_manager' && status === 'Detectada' && (
            <button onClick={() => transition('En análisis')} disabled={isPending} className="primary-btn disabled:opacity-60">Asignar y analizar</button>
          )}
          {(role === 'senior_management' || role === 'administrator') && status === 'Escalada' && (
            <button onClick={() => transition('En análisis')} disabled={isPending} className="primary-btn disabled:opacity-60">Asignar recursos</button>
          )}
          {role === 'environmental_manager' && status === 'En análisis' && (
            <button onClick={() => transition('En ejecución')} disabled={isPending} className="primary-btn disabled:opacity-60">Aprobar plan con causa raíz</button>
          )}
          {role === 'environmental_manager' && status === 'En ejecución' && (
            <button onClick={() => transition('En verificación')} disabled={isPending} className="primary-btn disabled:opacity-60">Acción completada</button>
          )}
          {role === 'auditor' && status === 'En verificación' && (<>
            <button onClick={() => transition('Cerrada')} disabled={isPending} className="primary-btn disabled:opacity-60">Acción eficaz → Cerrar</button>
            <button onClick={() => transition('En análisis')} disabled={isPending} className="secondary-btn disabled:opacity-60">Acción ineficaz → Reanalizar</button>
          </>)}
          {role === 'environmental_manager' && status === 'Vencida' && (
            <button onClick={() => transition('En ejecución')} disabled={isPending} className="primary-btn disabled:opacity-60">Nuevo plazo → En ejecución</button>
          )}
        </div>
      </div>

      {/* Línea de tiempo */}
      <section className="card mt-5 p-6">
        <h3 className="section-title mb-5">Línea de tiempo</h3>
        <div className="relative pl-5">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-[#CBD8CB]" />
          {/* Estado actual como último paso */}
          {statusOrder.filter((_, i) => i <= statusOrder.indexOf(status === 'Vencida' ? 'En ejecución' : status)).map((s, i, arr) => {
            const isLast = i === arr.length - 1
            const log = logs.find(l => l.detail?.includes(s))
            return (
              <div key={s} className="relative mb-5 pl-5">
                <span className={`absolute -left-[3px] top-1 size-3 rounded-full border-2 ${isLast ? 'border-[#2F6B3F] bg-[#2F6B3F]' : 'border-[#CBD8CB] bg-white'}`} style={{ borderColor: statusColors[s] ?? '#CBD8CB', backgroundColor: isLast ? (statusColors[s] ?? '#2F6B3F') : 'white' }} />
                <p className="text-sm font-semibold" style={{ color: statusColors[s] ?? '#17251B' }}>{s}</p>
                {log && <p className="text-xs text-[#5B6B5F] mt-0.5">{formatDate(log.date)} {typeof log.user === 'object' ? `· ${(log.user as { name?: string }).name ?? ''}` : ''}</p>}
              </div>
            )
          })}
        </div>
      </section>

      {/* Acción correctiva */}
      {nc.correctiveAction?.description && (
        <section className="card mt-5 p-6">
          <h3 className="section-title mb-4">Acción correctiva</h3>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div><p className="text-xs text-[#5B6B5F]">Descripción</p><p className="mt-0.5">{nc.correctiveAction.description}</p></div>
            <div><p className="text-xs text-[#5B6B5F]">Recursos</p><p className="mt-0.5">{nc.correctiveAction.resources ?? '—'}</p></div>
            <div><p className="text-xs text-[#5B6B5F]">Plazo</p><p className="mt-0.5">{formatDate(nc.correctiveAction.deadline)}</p></div>
            <div><p className="text-xs text-[#5B6B5F]">Eficacia</p><p className="mt-0.5">{nc.correctiveAction.effective === 'verdadero' ? '✓ Eficaz' : nc.correctiveAction.effective === 'falso' ? '✗ Ineficaz' : 'Pendiente de verificación'}</p></div>
          </div>
        </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Audit Detail (P16)
// ---------------------------------------------------------------------------

type AuditDoc = {
  id: string | number
  area?: string
  scope?: string
  criteria?: string
  date?: string
  status?: string
  auditor?: { name?: string } | string
  findings?: { description?: string; criteria?: string; criticality?: string; isNonConformity?: boolean; evidenceUrl?: string }[]
}

function AuditDetail({ auditId, onBack }: { auditId: string; onBack: () => void }) {
  const { currentUser } = useContext(AppContext)
  const [audit, setAudit] = useState<AuditDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [fDesc, setFDesc] = useState('')
  const [fCriteria, setFCriteria] = useState('')
  const [fCriticality, setFCriticality] = useState<'Normal' | 'Crítica'>('Normal')
  const [fIsNC, setFIsNC] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')

  const refresh = () => {
    setLoading(true)
    getAuditById(auditId).then(res => {
      if (res.success) setAudit(res.data as AuditDoc)
      setLoading(false)
    })
  }
  useEffect(() => { refresh() }, [auditId])

  const role = currentUser?.role ?? ''
  const auditorName = typeof audit?.auditor === 'object' ? (audit.auditor as { name?: string }).name ?? '—' : '—'

  const submitFinding = () => {
    if (!fDesc || !fCriteria) return
    startTransition(async () => {
      const res = await addFindingToAudit(auditId, { description: fDesc, criteria: fCriteria, criticality: fCriticality, isNonConformity: fIsNC })
      if (res.success) {
        setToast(fIsNC ? 'Hallazgo agregado y NC creada' : 'Hallazgo agregado')
        setShowForm(false); setFDesc(''); setFCriteria(''); setFCriticality('Normal'); setFIsNC(false)
        refresh()
      } else setToast(res.error ?? 'Error')
      setTimeout(() => setToast(''), 3000)
    })
  }

  const closeAudit = () => {
    startTransition(async () => {
      const res = await updateAudit(auditId, { status: 'Cerrada' })
      if (res.success) { setToast('Auditoría cerrada'); refresh() }
      else setToast(res.error ?? 'Error')
      setTimeout(() => setToast(''), 3000)
    })
  }

  if (loading) return <div className="mt-8 space-y-4">{[1,2].map(i => <div key={i} className="card animate-pulse h-24" />)}</div>
  if (!audit) return <p className="mt-6 text-sm text-[#5B6B5F]">No se encontró la auditoría.</p>

  return (
    <div>
      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#2F6B3F] px-5 py-3 text-sm font-medium text-white shadow-lg">{toast}</div>}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-[#2F6B3F]"><Icon name="arrow" size={16} /> Volver</button>
        <span className="text-[#CBD8CB]">/</span>
        <span className="text-sm text-[#5B6B5F]">{audit.area}</span>
      </div>
      <div className="card p-6">
        <div className="flex flex-wrap justify-between gap-3">
          <div><h2 className="text-xl font-semibold">{audit.area}</h2><p className="text-sm text-[#5B6B5F] mt-1">Auditor: {auditorName} · Fecha: {formatDate(audit.date)}</p></div>
          <Badge>{audit.status ?? '—'}</Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          <div><p className="text-xs text-[#5B6B5F]">Alcance</p><p className="mt-0.5">{audit.scope ?? '—'}</p></div>
          <div><p className="text-xs text-[#5B6B5F]">Criterios</p><p className="mt-0.5">{audit.criteria ?? '—'}</p></div>
        </div>
        {role === 'auditor' && audit.status !== 'Cerrada' && (
          <div className="mt-5 flex gap-3 pt-4 border-t border-[#E5EBE5]">
            <button onClick={() => setShowForm(true)} className="primary-btn">+ Agregar hallazgo</button>
            <button onClick={closeAudit} disabled={isPending} className="secondary-btn disabled:opacity-60">Cerrar auditoría</button>
          </div>
        )}
      </div>

      {/* Formulario hallazgo */}
      {showForm && (
        <div className="card mt-5 p-6 space-y-4">
          <h3 className="section-title">Nuevo hallazgo</h3>
          <label className="block text-sm font-medium">Descripción<textarea required className="field mt-2 min-h-20" value={fDesc} onChange={e => setFDesc(e.target.value)} /></label>
          <label className="block text-sm font-medium">Criterio incumplido<input required className="field mt-2" value={fCriteria} onChange={e => setFCriteria(e.target.value)} /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-medium">Criticidad
              <select className="field mt-2" value={fCriticality} onChange={e => setFCriticality(e.target.value as 'Normal' | 'Crítica')}>
                <option value="Normal">Normal</option>
                <option value="Crítica">Crítica</option>
              </select>
            </label>
            <label className="flex items-center gap-2 mt-7 text-sm font-medium cursor-pointer">
              <input type="checkbox" className="accent-[#2F6B3F]" checked={fIsNC} onChange={e => setFIsNC(e.target.checked)} />
              Genera no conformidad
            </label>
          </div>
          {fIsNC && <p className={`rounded-lg px-3 py-2 text-xs ${fCriticality === 'Crítica' ? 'bg-[#F8DAD4] text-[#A8321F]' : 'bg-[#FBEBCB] text-[#A86A00]'}`}>
            Se creará una NC en estado {fCriticality === 'Crítica' ? 'Escalada (notifica Alta Dirección)' : 'Detectada'}.
          </p>}
          <div className="flex gap-2">
            <button onClick={submitFinding} disabled={isPending} className="primary-btn disabled:opacity-60">Guardar hallazgo</button>
            <button onClick={() => setShowForm(false)} className="secondary-btn">Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista hallazgos */}
      <section className="card mt-5 p-6">
        <h3 className="section-title mb-4">Hallazgos ({(audit.findings ?? []).length})</h3>
        {(audit.findings ?? []).length === 0 ? (
          <p className="text-sm text-[#5B6B5F]">Sin hallazgos registrados.</p>
        ) : (
          <div className="space-y-3">
            {(audit.findings ?? []).map((f, i) => (
              <div key={i} className="rounded-lg border border-[#E5EBE5] p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{f.description}</p>
                  <div className="flex gap-2 shrink-0">
                    <Badge>{f.criticality === 'Crítica' ? 'Alta' : 'Media'}</Badge>
                    {f.isNonConformity && <span className="inline-flex rounded-full bg-[#F8DAD4] px-2 py-0.5 text-xs font-semibold text-[#A8321F]">NC</span>}
                  </div>
                </div>
                <p className="text-xs text-[#5B6B5F] mt-1">Criterio: {f.criteria}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Aspect Detail (P08)
// ---------------------------------------------------------------------------

type AspectDoc = {
  id: string | number
  name?: string
  activity?: string
  impact?: string
  severity?: number
  frequency?: number
  scope?: number
  significance?: number
  level?: string
}

function AspectDetail({ aspectId, onBack }: { aspectId: string; onBack: () => void }) {
  const { organizationId } = useContext(AppContext)
  const [asp, setAsp] = useState<AspectDoc | null>(null)
  const [related, setRelated] = useState<{ title?: string; compliance?: string }[]>([])
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getAspectById(aspectId),
      getAuditLogForRecord('aspects', aspectId),
      organizationId ? getLegalRequirements(organizationId) : Promise.resolve({ success: true, data: [] }),
    ]).then(([aRes, lRes, lrRes]) => {
      if (aRes.success) setAsp(aRes.data as AspectDoc)
      if (lRes.success) setLogs((lRes.data as unknown[]).map(d => d as AuditLogEntry))
      if (lrRes.success) {
        const all = (lrRes.data as unknown[]) ?? []
        const filtered = all.filter((d: unknown) => {
          const doc = d as { aspect?: { id?: string | number } | string | number }
          const aId = typeof doc.aspect === 'object' && doc.aspect !== null ? (doc.aspect as { id?: string | number }).id : doc.aspect
          return String(aId) === String(aspectId)
        })
        setRelated(filtered.map((d: unknown) => d as { title?: string; compliance?: string }))
      }
      setLoading(false)
    })
  }, [aspectId, organizationId])

  if (loading) return <div className="mt-8 space-y-4">{[1,2].map(i => <div key={i} className="card animate-pulse h-24" />)}</div>
  if (!asp) return <p className="mt-6 text-sm text-[#5B6B5F]">No se encontró el aspecto.</p>

  const sig = asp.significance ?? ((asp.severity ?? 0) * (asp.frequency ?? 0) * (asp.scope ?? 0))

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-[#2F6B3F]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{transform:'rotate(180deg)'}} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
          Volver
        </button>
        <span className="text-[#CBD8CB]">/</span>
        <span className="text-sm text-[#5B6B5F] truncate">{asp.name}</span>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{asp.name}</h2>
            <p className="mt-1 text-sm text-[#5B6B5F]">Actividad: {asp.activity ?? '—'}</p>
          </div>
          <Badge>{asp.level ?? 'Pendiente'}</Badge>
        </div>
        <p className="mt-4 text-sm text-[#5B6B5F] leading-6"><strong>Impacto:</strong> {asp.impact ?? '—'}</p>

        {/* Fórmula de significancia */}
        <div className="mt-5 rounded-lg bg-[#F2F6F1] p-4">
          <p className="text-xs font-semibold text-[#5B6B5F] uppercase tracking-wide mb-3">Cálculo de significancia</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {[['Severidad', asp.severity], ['×', null], ['Frecuencia', asp.frequency], ['×', null], ['Alcance', asp.scope], ['=', null]].map(([label, val], i) =>
              val === null ? (
                <span key={i} className="text-[#5B6B5F] font-bold">{label}</span>
              ) : (
                <div key={i} className="flex flex-col items-center rounded-lg bg-white border border-[#CBD8CB] px-3 py-2 min-w-[60px]">
                  <span className="text-lg font-bold text-[#2F6B3F]">{val ?? '—'}</span>
                  <span className="text-[10px] text-[#5B6B5F]">{label}</span>
                </div>
              )
            )}
            <div className="flex flex-col items-center rounded-lg bg-[#2F6B3F] text-white px-4 py-2 min-w-[70px]">
              <span className="text-lg font-bold">{sig || '—'}</span>
              <span className="text-[10px] opacity-80">Significancia</span>
            </div>
          </div>
        </div>
      </div>

      {/* Requisitos legales asociados */}
      {related.length > 0 && (
        <section className="card mt-5 p-6">
          <h3 className="section-title mb-4">Requisitos legales asociados</h3>
          <div className="space-y-2">
            {related.map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-[#F8FAF8] px-4 py-3">
                <span className="text-sm font-medium">{r.title ?? '—'}</span>
                <Badge>{r.compliance ?? 'Sin evaluar'}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Historial */}
      <section className="card mt-5 p-6">
        <h3 className="section-title mb-4">Historial de cambios</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-[#5B6B5F]">Sin historial registrado.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((l, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg bg-[#F8FAF8] px-4 py-3 text-sm">
                <span className="mt-0.5 size-2 rounded-full bg-[#CBD8CB] shrink-0" />
                <div>
                  <p className="font-medium">{l.detail ?? l.action}</p>
                  <p className="text-xs text-[#5B6B5F] mt-0.5">{formatDate(l.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Objectives page
// ---------------------------------------------------------------------------

function ObjectivesPage({ onAdd }: { onAdd: () => void }) {
  const { currentUser, organizationId } = useContext(AppContext)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cards, setCards] = useState<
    {
      id: string
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
              id?: string | number
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
              id: String(doc.id ?? ''),
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

  if (selectedId) return <ObjectiveDetail objId={selectedId} onBack={() => setSelectedId(null)} />

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
        <EmptyState
          icon="target"
          title="Sin objetivos registrados"
          description="Define metas SMART para mejorar el desempeño ambiental de tu organización."
          action={currentUser?.role === 'environmental_manager' || currentUser?.role === 'administrator' ? 'Nuevo objetivo' : undefined}
          onAction={onAdd}
        />
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
                <button onClick={() => setSelectedId(x.id)} className="font-semibold text-[#2F6B3F]">Ver detalle</button>
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
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

  if (selectedId) return <NonConformityDetail ncId={selectedId} onBack={() => setSelectedId(null)} />

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
      ) : ncDocs.length === 0 ? (
        <EmptyState
          icon="alert"
          title="Sin no conformidades registradas"
          description="Las no conformidades se crean automáticamente al marcar un requisito como 'No cumple' o al registrar un hallazgo de auditoría."
        />
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
                      onClick={() => setSelectedId(n.id)}
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
                    <div className="rounded-lg bg-white/60 px-3 py-5 text-center">
                      <p className="text-xs text-[#5B6B5F]">Sin registros</p>
                    </div>
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
  const { organizationId } = useContext(AppContext)

  // ── Estado con datos reales ──────────────────────────────────────────────
  const [stats, setStats] = useState({
    legal: { cumple: 0, noCumple: 0, sinEvaluar: 0, total: 0 },
    objectives: { cumplidos: 0, total: 0 },
    aspects: { alta: 0, media: 0, baja: 0 },
    nc: { cerradas: 0, byStatus: {} as Record<string, number> },
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId) return
    Promise.all([
      getAspects(organizationId),
      getLegalRequirements(organizationId),
      getObjectives(organizationId),
      getNonConformities(organizationId),
    ]).then(([asp, leg, obj, nc]) => {
      // Aspectos por nivel
      const aspects = (asp.data as { level?: string }[] ?? [])
      const alta = aspects.filter(a => a.level === 'Alta').length
      const media = aspects.filter(a => a.level === 'Media').length
      const baja = aspects.filter(a => a.level === 'Baja').length

      // Requisitos legales
      const legDocs = (leg.data as { compliance?: string }[] ?? [])
      const cumple = legDocs.filter(d => d.compliance === 'Cumple').length
      const noCumple = legDocs.filter(d => d.compliance === 'No cumple').length
      const sinEvaluar = legDocs.filter(d => d.compliance === 'Sin evaluar').length

      // Objetivos
      const objDocs = (obj.data as { status?: string }[] ?? [])
      const cumplidos = objDocs.filter(o => o.status === 'Cumplido').length

      // No conformidades
      const ncDocs = (nc.data as { status?: string }[] ?? [])
      const ncCerradas = ncDocs.filter(n => n.status === 'Cerrada').length
      const byStatus: Record<string, number> = {}
      ncDocs.forEach(n => {
        const s = n.status ?? 'Desconocido'
        byStatus[s] = (byStatus[s] ?? 0) + 1
      })

      setStats({
        legal: { cumple, noCumple, sinEvaluar, total: legDocs.length },
        objectives: { cumplidos, total: objDocs.length },
        aspects: { alta, media, baja },
        nc: { cerradas: ncCerradas, byStatus },
      })
      setLoading(false)
    })
  }, [organizationId])

  // ── CSV con datos reales ─────────────────────────────────────────────────
  const exportCSV = () => {
    const pct = (n: number, d: number) => d > 0 ? `${Math.round((n / d) * 100)}%` : '0%'
    const rows = [
      ['Indicador', 'Valor', 'Total'],
      ['Cumplimiento legal', pct(stats.legal.cumple, stats.legal.total), String(stats.legal.total)],
      ['Objetivos cumplidos', pct(stats.objectives.cumplidos, stats.objectives.total), String(stats.objectives.total)],
      ['Aspectos en nivel alto', String(stats.aspects.alta), String(stats.aspects.alta + stats.aspects.media + stats.aspects.baja)],
      ['NC cerradas', String(stats.nc.cerradas), String(Object.values(stats.nc.byStatus).reduce((a, b) => a + b, 0))],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'ecocert-360-indicadores.csv'
    a.click()
  }

  // ── Cálculos derivados ───────────────────────────────────────────────────
  const pctLegal = stats.legal.total > 0
    ? Math.round((stats.legal.cumple / stats.legal.total) * 100)
    : 0
  const pctObj = stats.objectives.total > 0
    ? Math.round((stats.objectives.cumplidos / stats.objectives.total) * 100)
    : 0
  const totalAspectos = stats.aspects.alta + stats.aspects.media + stats.aspects.baja
  const totalNC = Object.values(stats.nc.byStatus).reduce((a, b) => a + b, 0)

  const kpiCards = [
    { label: 'Cumplimiento legal', value: `${pctLegal}%` },
    { label: 'Objetivos cumplidos', value: `${pctObj}%` },
    { label: 'Aspectos en nivel alto', value: String(stats.aspects.alta) },
    { label: 'NC cerradas', value: String(stats.nc.cerradas) },
  ]

  const aspectBars = [
    { label: 'Alta', count: stats.aspects.alta, pct: totalAspectos > 0 ? Math.round((stats.aspects.alta / totalAspectos) * 100) : 0 },
    { label: 'Media', count: stats.aspects.media, pct: totalAspectos > 0 ? Math.round((stats.aspects.media / totalAspectos) * 100) : 0 },
    { label: 'Baja', count: stats.aspects.baja, pct: totalAspectos > 0 ? Math.round((stats.aspects.baja / totalAspectos) * 100) : 0 },
  ]

  const ncStatuses = ['Detectada', 'En análisis', 'En ejecución', 'Vencida', 'En verificación', 'Cerrada', 'Escalada']
  const ncColors: Record<string, string> = {
    Detectada: '#DCA444', 'En análisis': '#5A8DB2', 'En ejecución': '#2F6B3F',
    Vencida: '#B94B39', 'En verificación': '#5A8DB2', Cerrada: '#6B7280', Escalada: '#B94B39',
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
      </div>

      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="card animate-pulse h-28 p-5" />)}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map(k => (
              <div key={k.label} className="card p-5">
                <p className="text-sm text-[#5B6B5F]">{k.label}</p>
                <p className="mt-3 text-3xl font-semibold">{k.value}</p>
                {totalAspectos === 0 && k.label === 'Aspectos en nivel alto' && (
                  <p className="mt-2 text-xs text-[#5B6B5F]">Sin datos aún</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Aspectos por nivel */}
            <section className="card p-6">
              <h2 className="section-title">Aspectos por nivel</h2>
              {totalAspectos === 0 ? (
                <p className="mt-6 text-sm text-[#5B6B5F]">Sin aspectos registrados aún.</p>
              ) : (
                <div className="mt-8 space-y-5">
                  {aspectBars.map(x => (
                    <div key={x.label} className="grid grid-cols-[60px_1fr_40px] items-center gap-3 text-sm">
                      <Badge>{x.label}</Badge>
                      <div className="h-3 rounded-full bg-[#E8EDE8]">
                        <div className="h-full rounded-full bg-[#2F6B3F]" style={{ width: `${x.pct}%` }} />
                      </div>
                      <span className="font-semibold">{x.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* NC por estado */}
            <section className="card p-6">
              <h2 className="section-title">No conformidades por estado</h2>
              {totalNC === 0 ? (
                <p className="mt-6 text-sm text-[#5B6B5F]">Sin no conformidades registradas aún.</p>
              ) : (
                <div className="mt-6 flex items-end justify-around gap-2 border-b border-[#DDE5DD] pb-2">
                  {ncStatuses.filter(s => stats.nc.byStatus[s]).map(s => {
                    const count = stats.nc.byStatus[s] ?? 0
                    const heightPct = Math.round((count / Math.max(...Object.values(stats.nc.byStatus))) * 100)
                    return (
                      <div key={s} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-xs font-semibold">{count}</span>
                        <div className="w-full max-w-10 rounded-t-md" style={{ height: `${Math.max(heightPct, 10)}px`, backgroundColor: ncColors[s] ?? '#6B7280' }} />
                        <span className="text-[9px] text-center text-[#5B6B5F] leading-tight">{s}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Cumplimiento legal */}
            <section className="card p-6">
              <h2 className="section-title">Cumplimiento legal</h2>
              {stats.legal.total === 0 ? (
                <p className="mt-4 text-sm text-[#5B6B5F]">Sin requisitos legales registrados aún.</p>
              ) : (
                <>
                  <div className="mt-4 flex items-center justify-between text-sm font-semibold">
                    <span>{pctLegal}%</span>
                    <span className="text-[#5B6B5F] font-normal">{stats.legal.cumple} de {stats.legal.total}</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#ECEFF1]">
                    <div className="h-full bg-[#2F6B3F] rounded-full" style={{ width: `${pctLegal}%` }} />
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-semibold">{stats.legal.cumple}</p>
                      <p className="text-xs text-[#5B6B5F]">Cumplen</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-[#A8321F]">{stats.legal.noCumple}</p>
                      <p className="text-xs text-[#5B6B5F]">No cumplen</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-[#6B7280]">{stats.legal.sinEvaluar}</p>
                      <p className="text-xs text-[#5B6B5F]">Sin evaluar</p>
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* Objetivos */}
            <section className="card p-6">
              <h2 className="section-title">Progreso de objetivos</h2>
              {stats.objectives.total === 0 ? (
                <p className="mt-4 text-sm text-[#5B6B5F]">Sin objetivos registrados aún.</p>
              ) : (
                <>
                  <div className="mt-4 flex items-center justify-between text-sm font-semibold">
                    <span>{pctObj}% cumplidos</span>
                    <span className="text-[#5B6B5F] font-normal">{stats.objectives.cumplidos} de {stats.objectives.total}</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#ECEFF1]">
                    <div className="h-full bg-[#2F6B3F] rounded-full" style={{ width: `${pctObj}%` }} />
                  </div>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

function Parameters() {
  const { organizationId } = useContext(AppContext)
  const [umbralAlta, setUmbralAlta] = useState(60)
  const [umbralMedia, setUmbralMedia] = useState(27)
  const [dias30, setDias30] = useState(true)
  const [dias15, setDias15] = useState(true)
  const [dias7, setDias7] = useState(true)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!organizationId) return
    getParameters(organizationId).then(res => {
      if (res.success && res.data) {
        const d = res.data as { umbral_alta?: number; umbral_media?: number; dias_alerta?: number[] }
        if (d.umbral_alta) setUmbralAlta(d.umbral_alta)
        if (d.umbral_media) setUmbralMedia(d.umbral_media)
        if (d.dias_alerta) {
          setDias30(d.dias_alerta.includes(30))
          setDias15(d.dias_alerta.includes(15))
          setDias7(d.dias_alerta.includes(7))
        }
      }
      setLoading(false)
    })
  }, [organizationId])

  const handleSave = () => {
    if (!organizationId) return
    const diasAlerta = [dias30 && 30, dias15 && 15, dias7 && 7].filter(Boolean) as number[]
    startTransition(async () => {
      const res = await saveParameters(organizationId, { umbralAlta, umbralMedia, diasAlerta })
      if (res.success) setToast('Parámetros guardados correctamente')
      else setToast(res.error ?? 'Error al guardar')
      setTimeout(() => setToast(''), 3000)
    })
  }

  return (
    <div>
      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#2F6B3F] px-5 py-3 text-sm font-medium text-white shadow-lg">{toast}</div>}
      <PageHeading
        title="Parámetros del sistema"
        desc="Configura umbrales y alertas para tu organización."
      />
      {loading ? (
        <div className="mt-6 max-w-3xl space-y-4">
          <div className="card animate-pulse h-32" />
          <div className="card animate-pulse h-24" />
        </div>
      ) : (
        <div className="mt-6 grid max-w-3xl gap-6">
          <section className="card p-6">
            <h2 className="section-title">Significancia ambiental</h2>
            <p className="mt-1 text-sm text-[#5B6B5F]">
              Los niveles se calculan como severidad × frecuencia × alcance (rango 1–125).
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Umbral nivel Alto (≥)
                <input className="field mt-2" type="number" min={1} max={125} value={umbralAlta} onChange={e => setUmbralAlta(Number(e.target.value))} />
                <span className="mt-1 block text-xs text-[#5B6B5F]">Por defecto: 60</span>
              </label>
              <label className="text-sm font-medium">
                Umbral nivel Medio (≥)
                <input className="field mt-2" type="number" min={1} max={125} value={umbralMedia} onChange={e => setUmbralMedia(Number(e.target.value))} />
                <span className="mt-1 block text-xs text-[#5B6B5F]">Por defecto: 27. Baja si es menor a este umbral.</span>
              </label>
            </div>
            {/* Vista previa */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#F8DAD4] px-3 py-1 text-xs font-semibold text-[#A8321F]">Alta ≥ {umbralAlta}</span>
              <span className="rounded-full bg-[#FBEBCB] px-3 py-1 text-xs font-semibold text-[#A86A00]">Media ≥ {umbralMedia}</span>
              <span className="rounded-full bg-[#DDEBDD] px-3 py-1 text-xs font-semibold text-[#2F6B3F]">Baja &lt; {umbralMedia}</span>
            </div>
          </section>
          <section className="card p-6">
            <h2 className="section-title">Alertas de vencimiento de requisitos</h2>
            <p className="mt-1 text-sm text-[#5B6B5F]">
              El sistema generará notificaciones preventivas con esta anticipación.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {([{ label: '30 días antes', val: dias30, set: setDias30 }, { label: '15 días antes', val: dias15, set: setDias15 }, { label: '7 días antes', val: dias7, set: setDias7 }]).map(({ label, val, set }) => (
                <label key={label} className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm cursor-pointer transition ${val ? 'border-[#2F6B3F] bg-[#F4FAF4]' : 'border-[#CBD8CB]'}`}>
                  <input type="checkbox" className="accent-[#2F6B3F]" checked={val} onChange={e => set(e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          </section>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="primary-btn w-fit disabled:opacity-60"
          >
            <Icon name="check" size={17} />
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}
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

  // Invitar usuario fields
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteRole, setInviteRole] = useState('environmental_manager')

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
      } else if (page === 'usuarios') {
        result = await inviteUser({
          orgId: organizationId!,
          name: inviteName,
          email: inviteEmail,
          password: invitePassword,
          role: inviteRole,
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
    usuarios: 'Invitar usuario',
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

          {/* ---- USUARIOS (invitar) ---- */}
          {page === 'usuarios' && (
            <>
              <div className="rounded-lg bg-[#F2F6F1] px-4 py-3 text-xs text-[#5B6B5F]">
                El usuario recibirá acceso a la organización <strong>{currentUser?.organization?.name}</strong> con el rol asignado. Deberá iniciar sesión con el correo y contraseña que indiques.
              </div>
              <label className="block text-sm font-medium">
                Nombre completo
                <input
                  required
                  className="field mt-2"
                  placeholder="Nombre del usuario"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Correo electrónico
                <input
                  required
                  type="email"
                  className="field mt-2"
                  placeholder="usuario@empresa.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Contraseña inicial
                <PasswordField
                  required
                  placeholder="Mínimo 8 caracteres"
                  value={invitePassword}
                  onChange={setInvitePassword}
                  minLength={8}
                />
              </label>
              <label className="block text-sm font-medium">
                Rol
                <select
                  required
                  className="field mt-2"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="senior_management">Alta dirección</option>
                  <option value="environmental_manager">Responsable ambiental</option>
                  <option value="auditor">Auditor</option>
                  <option value="collaborator">Colaborador</option>
                  <option value="supplier">Proveedor</option>
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
// AccessDenied
// ---------------------------------------------------------------------------

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-5 grid size-16 place-items-center rounded-full bg-[#F8DAD4] text-[#A8321F]">
        <Icon name="close" size={28} />
      </div>
      <h2 className="text-xl font-semibold text-[#17251B]">Acceso restringido</h2>
      <p className="mt-2 text-sm text-[#5B6B5F] max-w-xs mx-auto">
        No tienes permisos para ver esta sección. Contacta al administrador de tu organización.
      </p>
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

  // Fetch unread notification count + aplicar transiciones automáticas al abrir sesión
  useEffect(() => {
    if (!currentUser?.id) return
    getNotifications(currentUser.id).then((res) => {
      const docs = (res.data as unknown[]) ?? []
      setUnreadCount(docs.filter((d: unknown) => !(d as { read?: boolean }).read).length)
    })
    // RN-07, RN-10, RN-03 en background — solo cuando hay org activa
    const orgId = currentUser?.organization?.id
    if (orgId) checkAndApplyAutoTransitions(String(orgId)).catch(() => {})
  }, [currentUser?.id])

  const isAdmin = currentUser?.role === 'administrator'

  const ROLE_NAV_ALLOWLIST: Record<string, ReadonlyArray<string>> = {
    administrator:         ['panel','aspectos','legales','objetivos','auditorias','conformidades','incidentes','capacitacion','evidencias','reportes','usuarios','parametros'],
    senior_management:     ['panel','objetivos','auditorias','conformidades','incidentes','reportes'],
    environmental_manager: ['panel','aspectos','legales','objetivos','auditorias','conformidades','incidentes','capacitacion','evidencias','reportes'],
    auditor:               ['panel','aspectos','legales','auditorias','conformidades','reportes'],
    collaborator:          ['panel','incidentes','capacitacion'],
    supplier:              ['panel','evidencias'],
  }
  const allowedIds = ROLE_NAV_ALLOWLIST[currentUser?.role ?? ''] ?? ROLE_NAV_ALLOWLIST['collaborator']
  const visibleNav = nav.filter((n) => allowedIds.includes(n.id))

  // Auto-redirigir si la página actual no está permitida para este rol
  useEffect(() => {
    if (page === 'notificaciones') return
    if (page !== 'panel' && !allowedIds.includes(page)) setPage('panel')
  }, [page, currentUser?.role])

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

  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null)
  const [selectedAspectId, setSelectedAspectId] = useState<string | null>(null)

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
    // Guardia de acceso por rol
    if (page !== 'panel' && page !== 'notificaciones' && !allowedIds.includes(page)) {
      return <AccessDenied />
    }
    if (page === 'panel') return <Dashboard go={setPage} />
    if (page === 'auditorias' && selectedAuditId)
      return <AuditDetail auditId={selectedAuditId} onBack={() => setSelectedAuditId(null)} />
    if (page === 'aspectos' && selectedAspectId)
      return <AspectDetail aspectId={selectedAspectId} onBack={() => setSelectedAspectId(null)} />
    if (tablePages.includes(page))
      return (
        <TablePage
          page={page}
          onAdd={() => setModal(true)}
          refreshKey={refreshKey}
          onRowClick={(id) => {
            if (page === 'auditorias') setSelectedAuditId(id)
            if (page === 'aspectos') setSelectedAspectId(id)
          }}
        />
      )
    if (page === 'objetivos') return <ObjectivesPage onAdd={() => setModal(true)} />
    if (page === 'conformidades') return <NonConformities />
    if (page === 'reportes') return <Reports />
    if (page === 'parametros') return <Parameters />
    if (page === 'notificaciones') return <NotificationsPage />
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, refreshKey, selectedAuditId, selectedAspectId])

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
              <div className="mt-1">
                <RoleBadge role={currentUser?.role ?? 'collaborator'} size="xs" />
              </div>
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
        {/* Barra móvil dinámica: primeros 4 ítems del rol + "Más" */}
        {[
          ...visibleNav.slice(0, 4).map((n) => [n.id, n.label.length > 8 ? n.label.split(' ')[0] : n.label, n.icon] as const),
          ['__mas__', 'Más', 'menu'] as const,
        ].map((n) => (
          <button
            key={n[0]}
            onClick={() => n[0] === '__mas__' ? setMenu(true) : setPage(n[0] as PageId)}
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

  // Restore session from localStorage (cookies de Payload no se propagan en Vercel)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ecocert_user')
      if (saved) {
        const user = JSON.parse(saved) as AppUser
        if (user?.id && user?.organization?.id) {
          setCurrentUser(user)
          setLoggedIn(true)
          return
        }
      }
    } catch {}
    // Fallback: intentar con getCurrentUser si no hay localStorage
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
        const org = orgRaw
          ? typeof orgRaw === 'object' && 'id' in orgRaw
            ? { id: String((orgRaw as { id: string | number }).id), name: (orgRaw as { id: string | number; name?: string }).name ?? '' }
            : { id: String(orgRaw), name: '' }
          : undefined
        if (org?.id) {
          const appUser: AppUser = {
            id: String(u.id),
            name: u.name ?? '',
            email: u.email ?? '',
            role: u.role ?? 'collaborator',
            organization: org,
          }
          setCurrentUser(appUser)
          setLoggedIn(true)
          localStorage.setItem('ecocert_user', JSON.stringify(appUser))
        }
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
