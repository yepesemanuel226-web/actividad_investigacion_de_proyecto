# Implementation Plan — EcoCert 360

> Project: Next.js 16 App Router + Payload CMS 4 + Tailwind CSS v4 (Figma Make)
> Worktree: `c:\Users\emanu\Downloads\Web basada en especificaciones`
> **Never touch `src/app/(payload)/`. Never replace `buildFigmaConfig` with `buildConfig`.**
> Verify command: `cd "c:\Users\emanu\Downloads\Web basada en especificaciones" && pnpm run generate:types 2>&1 | head -60`

---

## Step 1 — Extend `src/collections/EcoCert.ts`: field additions to existing collections

**What to do:**

1. **Users** — add `responsible` field (relationship to `users`, optional) for area manager assignment.
   Wait — `responsible` on the Users collection itself does not make domain sense; re-reading the spec:
   "Users: add `responsible` field (relationship to users, optional) for area manager."
   This means the Users document can reference another user as its area manager. Add:
   ```ts
   { name: 'responsible', type: 'relationship', relationTo: 'users' }
   ```

2. **Aspects** — add `createdBy` field:
   ```ts
   { name: 'createdBy', type: 'relationship', relationTo: 'users' }
   ```

3. **LegalRequirements** — add `responsible` field:
   ```ts
   { name: 'responsible', type: 'relationship', relationTo: 'users' }
   ```

4. **Objectives.actions** array — add `responsible` subfield inside the existing `actions` array's `fields` list:
   ```ts
   { name: 'responsible', type: 'relationship', relationTo: 'users', required: true }
   ```
   (This is a new subfield inside the existing array block, not a top-level field.)

5. **Audits** — add `findings` array field after the existing `status` field:
   ```ts
   {
     name: 'findings',
     type: 'array',
     fields: [
       { name: 'description', type: 'text', required: true },
       { name: 'criteria', type: 'text', required: true },
       { name: 'criticality', type: 'select', required: true, options: ['Normal', 'Crítica'] },
       { name: 'isNonConformity', type: 'checkbox', defaultValue: false },
       { name: 'evidenceUrl', type: 'text' },
     ],
   }
   ```

6. **NonConformities** — add after the existing `owner` field:
   - `audit`: `{ name: 'audit', type: 'relationship', relationTo: 'audits' }`
   - `legalRequirement`: `{ name: 'legalRequirement', type: 'relationship', relationTo: 'legal-requirements' }`
   - `correctiveAction` group:
     ```ts
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
             { label: 'Verdadero', value: 'Verdadero' },
             { label: 'Falso', value: 'Falso' },
             { label: 'Vacío', value: 'Vacío' },
           ],
         },
       ],
     }
     ```
   - `closedAt`: `{ name: 'closedAt', type: 'date' }`

**Files:** `src/collections/EcoCert.ts`

**Verify:** `pnpm run generate:types 2>&1 | head -60` — must complete without TypeScript errors from these field shapes.

---

## Step 2 — Add five new collections to `src/collections/EcoCert.ts`

Add each new export at the bottom of the file, before the `ecoCertCollections` array export. Use the existing `appAccess` and `organizationField` constants (already defined at top of file).

### 2a. ObjectiveProgress
```ts
export const ObjectiveProgress: CollectionConfig = {
  slug: 'objective-progress',
  admin: { group: 'Gestión ambiental', useAsTitle: 'comment' },
  access: appAccess,
  fields: [
    { name: 'objective', type: 'relationship', relationTo: 'objectives', required: true },
    { name: 'value', type: 'number', required: true },
    { name: 'comment', type: 'text' },
    { name: 'date', type: 'date', required: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
  ],
}
```

### 2b. Incidents
```ts
export const Incidents: CollectionConfig = {
  slug: 'incidents',
  admin: { group: 'Gestión ambiental', useAsTitle: 'description' },
  access: appAccess,
  fields: [
    organizationField,
    { name: 'type', type: 'select', required: true, options: ['incidente', 'emergencia'] },
    { name: 'description', type: 'textarea', required: true },
    { name: 'date', type: 'date', required: true },
    { name: 'location', type: 'text' },
    { name: 'severity', type: 'select', required: true, options: ['Baja', 'Media', 'Alta'] },
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
```

### 2c. Trainings
```ts
export const Trainings: CollectionConfig = {
  slug: 'trainings',
  admin: { group: 'Gestión ambiental', useAsTitle: 'topic' },
  access: appAccess,
  fields: [
    organizationField,
    { name: 'topic', type: 'text', required: true },
    { name: 'date', type: 'date', required: true },
    { name: 'attendee', type: 'relationship', relationTo: 'users' },
    { name: 'result', type: 'number', min: 0, max: 100 },
    { name: 'competent', type: 'select', options: ['Sí', 'No'] },
  ],
}
```

### 2d. Evidences
```ts
export const Evidences: CollectionConfig = {
  slug: 'evidences',
  admin: { group: 'Gestión ambiental', useAsTitle: 'description' },
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
```

### 2e. AuditLog
```ts
export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  admin: { group: 'EcoCert 360', useAsTitle: 'action' },
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
    { name: 'date', type: 'date', defaultValue: () => new Date().toISOString() },
  ],
}
```

Also update the `ecoCertCollections` export at the bottom to include all five new collections:
```ts
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
```

**Files:** `src/collections/EcoCert.ts`

**Verify:** `pnpm run generate:types 2>&1 | head -60` — all new slugs appear in the generated `payload-types.ts` without errors.

---

## Step 3 — Update `src/payload.config.ts` to register the new collections

The existing config already spreads `ecoCertCollections` into the `collections` array. Because Step 2 adds the five new collections to `ecoCertCollections`, **no change to `src/payload.config.ts` is needed** — the spread already picks them up.

However, verify the import is still intact and that no named-import additions are needed. The current line is:
```ts
import { ecoCertCollections } from './collections/EcoCert'
```
This remains correct.

> **If** the coder wants to import the new collections individually for use inside config hooks or plugins, they may add named imports, but the collections array requires no change.

**Files:** `src/payload.config.ts` (read-only confirmation; no edit required)

**Verify:** `pnpm run generate:types 2>&1 | head -60` — all 13 EcoCert collections (organizations, users, aspects, legal-requirements, objectives, audits, non-conformities, notifications, objective-progress, incidents, trainings, evidences, audit-log) appear in `payload-types.ts`.

---

## Step 4 — Create `src/actions/ecocert.ts` (Server Actions layer)

Create `src/actions/ecocert.ts` from scratch. This file holds all server-side mutations and queries the UI will call.

### File-level structure
```ts
'use server'
import { getPayload } from 'payload'
import { cookies } from 'next/headers'
import config from '@/payload.config'
```

> **Note on `getCurrentUser`:** Payload 4 Local API uses `payload.auth({ headers })`. To call it from a Server Action, build a Headers object from `cookies()`. The pattern is:
> ```ts
> import { cookies } from 'next/headers'
> const cookieStore = await cookies()
> const headers = new Headers({ cookie: cookieStore.toString() })
> const { user } = await payload.auth({ headers })
> ```

> **Note on `overrideAccess`:** Every user-facing `payload.find`, `payload.findByID`, `payload.create`, and `payload.update` call must set `overrideAccess: false`. Internal helper calls (like auto-creating a NonConformity from within `updateLegalRequirement`) must also use `overrideAccess: false` and pass the authenticated `user`.

### Return type convention
Every exported function returns `Promise<{ success: boolean; data?: unknown; error?: string }>`.

### Functions to implement (in dependency order)

#### Auth functions
1. **`loginUser(email: string, password: string)`**
   - `payload.login({ collection: 'users', data: { email, password }, overrideAccess: false })`
   - On success return `{ success: true, data: result.user }`
   - On failure catch and return `{ success: false, error: message }`

2. **`registerUser(data: { orgName, nit, sector, name, email, password, role })`**
   - Step A: `payload.create({ collection: 'organizations', data: { name: orgName, nit, sector }, overrideAccess: false })`
   - Step B: `payload.create({ collection: 'users', data: { name, email, password, organization: org.id, role: 'administrator', active: true }, overrideAccess: false })`
   - Step C: call `loginUser(email, password)` and return its result
   - Wrap in try/catch; return `{ success: false, error }` on failure

3. **`getCurrentUser()`**
   - Build headers from `await cookies()`
   - `payload.auth({ headers })` — return `{ success: true, data: user }` if user exists, else `{ success: true, data: null }`

#### Organization / User queries
4. **`getOrganizations()`** — `payload.find({ collection: 'organizations', overrideAccess: false })`
5. **`getUsers(orgId: string)`** — `payload.find({ collection: 'users', where: { organization: { equals: orgId } }, overrideAccess: false })`

#### Aspects (RN-01, RN-02)
6. **`getAspects(orgId: string)`** — find all aspects for org
7. **`createAspect(data)`**
   - Compute `significance = (data.severity ?? 0) * (data.frequency ?? 0) * (data.scope ?? 0)`
   - If any factor is missing/0, set `level = 'Pendiente'` and call `createNotification` with a warning (RN-02)
   - Otherwise: `level = significance >= 60 ? 'Alta' : significance >= 27 ? 'Media' : 'Baja'` (RN-01)
   - `payload.create({ collection: 'aspects', data: { ...data, significance, level }, overrideAccess: false })`
   - Call `createAuditLog('aspects', result.id, 'crear', ...)` (RN-12)
8. **`updateAspect(id: string, data)`**
   - If severity/frequency/scope present, recalculate significance + level
   - `payload.update({ collection: 'aspects', id, data: { ...data, significance, level }, overrideAccess: false })`
   - Call `createAuditLog('aspects', id, 'editar', ...)`

#### Legal Requirements (RN-03, RN-04)
9. **`getLegalRequirements(orgId: string)`** — find all for org
10. **`createLegalRequirement(data)`** — create + audit log
11. **`updateLegalRequirement(id: string, data)`**
    - Fetch existing doc first: `payload.findByID({ collection: 'legal-requirements', id, overrideAccess: false })`
    - If `data.compliance === 'No cumple'` AND previous compliance was not `'No cumple'` (RN-04):
      - Auto-create NonConformity: `payload.create({ collection: 'non-conformities', data: { organization: existing.organization, code: `NC-LR-${id}`, description: `Incumplimiento: ${existing.title}`, origin: 'Requisito legal', criticality: 'Normal', status: 'Detectada', legalRequirement: id }, overrideAccess: false })`
      - Call `createNotification({ userId: existing.responsible, type: 'legal', message: `Requisito "${existing.title}" cambió a No cumple`, reference: id })`
    - `payload.update({ collection: 'legal-requirements', id, data, overrideAccess: false })`
    - Call `createAuditLog('legal-requirements', id, 'cambio_estado', ...)`

#### Objectives
12. **`getObjectives(orgId: string)`** — find all for org
13. **`createObjective(data)`** — validate at least 1 action with responsible/resources/deadline (RN-05); create + audit log
14. **`updateObjective(id: string, data)`** — update + audit log
15. **`addObjectiveProgress({ objectiveId, value, comment })`**
    - Get authenticated user from `getCurrentUser()`
    - `payload.create({ collection: 'objective-progress', data: { objective: objectiveId, value, comment, date: new Date().toISOString(), user: user.id }, overrideAccess: false })`
    - `payload.update({ collection: 'objectives', id: objectiveId, data: { currentValue: value }, overrideAccess: false })`
    - Audit log entry

#### Audits (RN-08)
16. **`getAudits(orgId: string)`** — find all for org
17. **`createAudit(data)`** — create + audit log
18. **`updateAudit(id: string, data)`**
    - `payload.update({ collection: 'audits', id, data, overrideAccess: false })`
    - For each finding in `data.findings` where `isNonConformity === true` (RN-08):
      - Determine status: `finding.criticality === 'Crítica' ? 'Escalada' : 'Detectada'`
      - Auto-create NonConformity: `payload.create({ collection: 'non-conformities', data: { organization: ..., code: `NC-AUD-${id}-${i}`, description: finding.description, origin: 'Auditoría', criticality: finding.criticality, status, audit: id }, overrideAccess: false })`
      - If `criticality === 'Crítica'`: call `createNotification` for all users with `role === 'senior_management'` in the same org
    - Audit log entry

#### Non-conformities
19. **`getNonConformities(orgId: string)`** — find all for org
20. **`createNonConformity(data)`** — create + audit log
21. **`updateNonConformity(id: string, data)`** — update + audit log

#### Incidents
22. **`getIncidents(orgId: string)`** — find all for org
23. **`createIncident(data)`** — create + audit log

#### Trainings
24. **`getTrainings(orgId: string)`** — find all for org
25. **`createTraining(data)`** — create + audit log

#### Evidences
26. **`getEvidences(orgId: string)`** — find all for org
27. **`createEvidence(data)`** — create + audit log

#### Notifications
28. **`getNotifications(userId: string)`** — `payload.find({ collection: 'notifications', where: { user: { equals: userId } }, overrideAccess: false })`
29. **`markNotificationRead(id: string)`** — `payload.update({ collection: 'notifications', id, data: { read: true }, overrideAccess: false })`
30. **`createNotification({ userId, type, message, reference? })`** — `payload.create({ collection: 'notifications', data: { user: userId, type, message, reference, read: false }, overrideAccess: false })`

#### Audit log
31. **`createAuditLog(table, recordId, action, detail, organizationId?, userId?)`** (RN-12)
    - If `userId` not passed, call `getCurrentUser()` to get it
    - `payload.create({ collection: 'audit-log', data: { table, recordId, action, detail, organization: organizationId, user: userId, date: new Date().toISOString() }, overrideAccess: false })`
    - This function intentionally does **not** throw on failure (swallow error silently) — audit log failures must not block the main operation

**Files:** `src/actions/ecocert.ts` (create new)

**Verify:** `pnpm run generate:types 2>&1 | head -60` — no type errors from the new actions file. Additionally, check that `src/actions/ecocert.ts` compiles without import errors by running `pnpm build 2>&1 | head -80` (TypeScript build). If the build env vars aren't available, at minimum confirm `tsc --noEmit` on that file passes.

---

## Step 5 — Wire authentication in `src/app/(frontend)/EcoCertApp.tsx`

Modify the existing `EcoCertApp.tsx` **in-place**. The file is `'use client'` already. Changes in this step:

1. **New imports** at top of file:
   ```ts
   import { useEffect, useCallback, useTransition, createContext, useContext } from 'react'
   import { loginUser, registerUser, getCurrentUser } from '@/actions/ecocert'
   ```

2. **AppContext** — add just below the imports:
   ```ts
   type AppUser = { id: string; name: string; role: string; email: string; collection: string }
   type AppCtx = { currentUser: AppUser | null; organizationId: string | null; setCurrentUser: (u: AppUser | null) => void }
   const AppContext = createContext<AppCtx>({ currentUser: null, organizationId: null, setCurrentUser: () => {} })
   ```

3. **Login component** — replace the static `onSubmit` with real server-action call:
   - Add local state: `const [email, setEmail] = useState('')`, `const [password, setPassword] = useState('')`, `const [error, setError] = useState<string | null>(null)`, `const [isPending, startTransition] = useTransition()`
   - For register form add states: `orgName`, `nit`, `sector`, `name`
   - `onSubmit`:
     ```ts
     e.preventDefault()
     setError(null)
     startTransition(async () => {
       const result = showRegister
         ? await registerUser({ orgName, nit, sector, name, email, password, role: 'administrator' })
         : await loginUser(email, password)
       if (result.success) {
         onLogin(result.data as AppUser)
       } else {
         setError(result.error ?? 'Error al iniciar sesión')
       }
     })
     ```
   - Show `{error && <p className="text-sm text-red-600">{error}</p>}` above the submit button
   - Keep the demo note in place (do not remove it)
   - Wire each `<input>` with its `value` and `onChange`

4. **EcoCertApp root component** — restore session on mount:
   ```ts
   const [loggedIn, setLoggedIn] = useState(false)
   const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
   useEffect(() => {
     getCurrentUser().then((r) => {
       if (r.success && r.data) {
         setCurrentUser(r.data as AppUser)
         setLoggedIn(true)
       }
     })
   }, [])
   ```
   - Change `<Login onLogin={() => setLoggedIn(true)} />` to `<Login onLogin={(u) => { setCurrentUser(u); setLoggedIn(true) }} />`
   - Wrap return with `<AppContext.Provider value={{ currentUser, organizationId: (currentUser as any)?.organization?.id ?? null, setCurrentUser }}>...</AppContext.Provider>`

5. **EcoCertShell** — add `user` prop received from context:
   - `const { currentUser } = useContext(AppContext)`
   - Replace hardcoded `'María Rodríguez'` and `'Resp. ambiental'` in sidebar footer with `currentUser?.name ?? 'Usuario'` and a mapped role label
   - Replace `'Buenos días, María'` heading with `'Buenos días, ' + (currentUser?.name?.split(' ')[0] ?? 'usuario')`
   - Replace `'EcoVerde S.A.S. · Responsable ambiental'` subheading with the org name when available

**Files:** `src/app/(frontend)/EcoCertApp.tsx`

**Verify:** Dev server renders login page without console errors. Submitting the form calls the server action (network tab shows a POST to `/`). On success the shell renders with the real user name. On bad credentials an inline error message appears.

---

## Step 6 — Wire Dashboard KPIs and notification badge

Inside `Dashboard` component, replace static `kpis` array values with live Payload data:

1. Add imports: `getAspects, getObjectives, getNonConformities, getLegalRequirements, getNotifications` from `@/actions/ecocert`
2. `Dashboard` now receives `orgId: string` and `userId: string` as props (passed down from `EcoCertShell` via `AppContext`)
3. Add state: `const [data, setData] = useState<{ aspects: number; objectives: number; ncs: number; expiring: number; unreadNotifs: number; loading: boolean }>({ aspects: 0, objectives: 0, ncs: 0, expiring: 0, unreadNotifs: 0, loading: true })`
4. `useEffect(() => { ... fetch all five ... setData({...}) }, [orgId, userId])`
5. For "Requisitos por vencer": filter `getLegalRequirements` result for items where `nextReview` is within 30 days
6. Show loading skeleton (a `<div className="animate-pulse h-8 w-16 rounded bg-gray-200" />`) in place of each number while `data.loading` is true
7. Replace the four hardcoded `kpis` values with real counts
8. Show real unread notification count in the notification bell dot / header badge

**Files:** `src/app/(frontend)/EcoCertApp.tsx`

**Verify:** With a logged-in session and at least one Aspect document in Payload, the Dashboard shows the real count instead of the static "8".

---

## Step 7 — Wire Aspectos table to live data and createAspect modal

1. Convert `TablePage` for the `'aspectos'` page to fetch from `getAspects(orgId)` using `useEffect`
2. Map Payload docs to the existing `rows: string[][]` shape: `[doc.id.toString(), doc.name, doc.impact, String(doc.significance ?? '—'), doc.level, doc.activity]`
3. Show `animate-pulse` skeleton rows while loading
4. The existing `Modal` component for `page === 'aspectos'` already has the significance calculation form — wire its submit button to call `createAspect`:
   ```ts
   const result = await createAspect({ organization: orgId, activity, name, impact, severity: s, frequency: f, scope: a, createdBy: currentUser?.id })
   if (result.success) { onClose(); refreshAspects() }
   else { setError(result.error) }
   ```
5. **Role gate**: show the "Nuevo aspecto" button only when `currentUser.role === 'environmental_manager' || currentUser.role === 'administrator'`

**Files:** `src/app/(frontend)/EcoCertApp.tsx`

**Verify:** Logged in as `environmental_manager`, the Aspectos page shows real docs from Payload. Submitting the new aspect modal creates a document visible in Payload admin.

---

## Step 8 — Wire Legales table (RN-03 expiry notifications) and modal

1. `TablePage` for `'legales'` fetches from `getLegalRequirements(orgId)`
2. Map to rows: `[doc.title, doc.issuer, (doc.aspect as any)?.name ?? '—', formatDate(doc.nextReview), doc.compliance]`
3. On mount, after fetching, check each doc's `nextReview`:
   ```ts
   const thresholds = [7, 15, 30]
   const today = new Date()
   docs.forEach(doc => {
     const daysLeft = Math.ceil((new Date(doc.nextReview).getTime() - today.getTime()) / 86400000)
     thresholds.forEach(t => {
       if (daysLeft <= t && daysLeft > 0) {
         createNotification({ userId: currentUser!.id, type: 'legal', message: `Requisito "${doc.title}" vence en ${daysLeft} días`, reference: doc.id.toString() })
       }
     })
   })
   ```
   (RN-03: creates a notification per threshold exceeded)
4. Modal for `page === 'legales'` — extend the existing `Modal` component to render legal requirement fields: title, issuer, aspect (select from loaded aspects), nextReview (date), compliance (select: Cumple/No cumple/Sin evaluar), responsible (select from users)
   Wire submit to call `createLegalRequirement({ ...formData, organization: orgId })`

**Files:** `src/app/(frontend)/EcoCertApp.tsx`

**Verify:** Legal requirements load from Payload. Creating one via the modal persists it. With a doc whose `nextReview` is within 30 days, a notification is created on page load.

---

## Step 9 — Wire Objetivos page and modal (RN-05)

1. `Objectives` component: fetch from `getObjectives(orgId)` on mount, replace static card data with real docs
2. Map doc to card: `[doc.title, (doc.owner as any)?.name ?? '—', Math.round((doc.currentValue / doc.target) * 100), doc.status, `${doc.target} ${doc.unit}`, formatDate(doc.deadline)]`
3. Add "Nuevo objetivo" modal under the existing pattern. Fields: title, indicator, target (number), unit, deadline (date), owner (relationship: select from users), status (select), plus a dynamic actions array (each row: description, resources, deadline, responsible — user select)
4. RN-05 validation: form must have at least 1 action row with all four fields filled before submitting
5. Wire submit to `createObjective(data)` — the action itself will also validate (see Step 4)
6. **Role gate**: "Aprobar objetivo" button (status change to 'Activo') only shown when `currentUser.role === 'senior_management' || currentUser.role === 'administrator'`

**Files:** `src/app/(frontend)/EcoCertApp.tsx`

**Verify:** Objectives page shows real data. Submitting a new objective without actions shows a validation error. Submitting with actions creates the doc.

---

## Step 10 — Wire Auditorias table and modal

1. `TablePage` for `'auditorias'` fetches from `getAudits(orgId)`
2. Map to rows: `[doc.id.toString(), doc.area, formatDate(doc.date), (doc.auditor as any)?.name ?? '—', doc.status]`
3. Modal for `'auditorias'`: fields — area (text), scope (textarea), criteria (textarea), date, auditor (user select), status (select), plus a dynamic `findings` array: description, criteria, criticality (Normal/Crítica), isNonConformity (checkbox), evidenceUrl
4. Wire submit to `createAudit(data)` and updates to `updateAudit(id, data)` (the action auto-creates NCs per RN-08)

**Files:** `src/app/(frontend)/EcoCertApp.tsx`

**Verify:** Audits load from Payload. Creating an audit with a finding where `isNonConformity = true` and `criticality = 'Crítica'` auto-creates a NonConformity with status `'Escalada'`.

---

## Step 11 — Wire Non-conformidades kanban to live data

1. `NonConformities` component: fetch from `getNonConformities(orgId)` on mount
2. Group docs by `status` into the four kanban columns: `['Detectada', 'En análisis', 'En ejecución', 'En verificación']`
3. Map each doc to a kanban card: `[doc.code, doc.description, doc.criticality]`
4. Remaining columns not in the static array ('Escalada', 'Vencida', 'Cerrada') can be shown as additional columns or omitted — keep 'Escalada' visible since it's auto-created by RN-08
5. Card click opens an inline detail view or modal showing corrective action fields

**Files:** `src/app/(frontend)/EcoCertApp.tsx`

**Verify:** At least one real NonConformity doc appears in the correct kanban column.

---

## Step 12 — Wire Incidentes, Capacitacion, Evidencias tables and modals

Wire the three remaining `TablePage` pages to live Payload data, following the same pattern as Steps 7–10.

### Incidentes
- Fetch: `getIncidents(orgId)`
- Rows: `[doc.id.toString(), doc.type, doc.description, formatDate(doc.date), doc.severity, doc.status]`
- Modal fields: type (select: incidente/emergencia), description, date, location, severity (Baja/Media/Alta), responsePlan (textarea), status (select), reportedBy (current user pre-filled)
- Submit: `createIncident({ ...data, organization: orgId, reportedBy: currentUser?.id })`

### Capacitacion
- Fetch: `getTrainings(orgId)`
- Rows: `[doc.topic, formatDate(doc.date), (doc.attendee as any)?.name ?? '—', `${doc.result ?? '—'}%`, doc.competent ?? '—']`
- Modal fields: topic, date, attendee (user select), result (number 0–100), competent (Sí/No)
- Submit: `createTraining({ ...data, organization: orgId })`

### Evidencias
- Fetch: `getEvidences(orgId)`
- Rows: `[(doc.file as any)?.filename ?? doc.description, (doc.sourceTable ?? '—'), doc.recordId ?? '—', formatDate((doc as any).createdAt), doc.statusReview]`
- Modal fields: description, sourceTable, recordId, statusReview (select), file (upload — `<input type="file" />`, handle via FormData + a separate `/api/evidences/upload` route handler, or via `payload.create` with the file path; use the `media` upload relationship)
- Submit: `createEvidence({ ...data, organization: orgId, uploadedBy: currentUser?.id })`

**Files:** `src/app/(frontend)/EcoCertApp.tsx`

**Verify:** Each page loads real docs. Creating a training or incident via modal persists a Payload document.

---

## Step 13 — Wire Notificaciones page and Usuarios page

### Notificaciones
1. Replace static notification array in the `notificaciones` branch of `EcoCertShell` with fetched `getNotifications(currentUser.id)` data
2. Map doc to card: message, `doc.read ? '' : 'bg-[#F4F8F4]'`, type icon, relative time from `doc.createdAt`
3. `onClick` on each notification calls `markNotificationRead(doc.id.toString())`
4. The notification bell dot in the header should show only when unread count > 0

### Usuarios
1. `TablePage` for `'usuarios'` fetches from `getUsers(orgId)`
2. Map to rows: `[doc.name, doc.email, roleLabelMap[doc.role], 'Desconocido', doc.active ? 'Activo' : 'Inactivo']`
3. **Role gate**: `'Usuarios y roles'` nav item visible only when `currentUser.role === 'administrator'`
4. **Role gate**: `'Parámetros'` nav item visible only when `currentUser.role === 'administrator'`

**Files:** `src/app/(frontend)/EcoCertApp.tsx`

**Verify:** Notifications page loads real notifications for the logged-in user. Clicking one marks it read (the dot disappears or count decreases). Logged in as a non-administrator, the Usuarios and Parámetros nav items are hidden.

---

## Step 14 — Final TypeScript check and fix

After all files are written:

1. Run `pnpm run generate:types 2>&1 | head -60` and read the output
2. Fix any TypeScript errors that appear. Common issues to expect:
   - `options` on a `select` field must be `string[]` or `{ label: string; value: string }[]` — the two shapes cannot be mixed. Use `{ label, value }` objects whenever the displayed label differs from the stored value; use plain strings when they're the same.
   - `relationTo` on `upload` fields takes a string slug, not an object — `'media'` is correct.
   - `defaultValue` on a `date` field should be a function `() => new Date().toISOString()` or an ISO string.
   - In `EcoCertApp.tsx`, `useTransition` returns `[isPending, startTransition]` where `startTransition` accepts a sync function in React 18 but an async function in React 19 (which this project uses). Use directly without wrapping.
3. Do NOT run `pnpm install` (no new deps needed — all APIs used are already in `payload`, `next`, and `react`).
4. Do NOT touch `src/app/(payload)/`.

**Files:** `src/collections/EcoCert.ts`, `src/actions/ecocert.ts`, `src/app/(frontend)/EcoCertApp.tsx`

**Verify:** `pnpm run generate:types 2>&1 | head -60` exits with no errors. All three modified/created files have no red underlines from TypeScript errors.

---

## Dependency order summary

```
Step 1 → Step 2 (fields in existing collections must come before new collections)
         ↓
Step 3 (payload.config.ts — no-op but confirm)
         ↓
Step 4 (server actions — depend on collection slugs established in Steps 1-2)
         ↓
Step 5 (auth wiring — depends on loginUser/registerUser/getCurrentUser from Step 4)
         ↓
Step 6 (dashboard — depends on AppContext from Step 5 + data actions from Step 4)
         ↓
Steps 7–13 (each page wire-up — independent of each other, all depend on Steps 4–5)
         ↓
Step 14 (final typecheck — all files must be written first)
```

Steps 7–13 may be done in any order relative to each other.
