export type SiteSettings = {
  title?: string
  description?: string
  language?: string
  robots?: { index?: boolean }
  icons?: { icon?: string }
  openGraph?: { image?: string }
  analytics?: { googleAnalyticsId?: string }
  customScripts?: {
    headStart?: string
    headEnd?: string
    bodyStart?: string
    bodyEnd?: string
  }
  accessibility?: { addBypassLinks?: boolean }
}

export const makeSiteSettings: SiteSettings = {
  title: 'EcoCert 360',
  description: 'Plataforma de gestión ambiental para la certificación ISO 14001:2015',
  language: 'es',
}

export function sanitizeHtmlAttribute(value: string | undefined): string {
  return value?.replace(/[^a-zA-Z0-9_-]/g, '') || ''
}
