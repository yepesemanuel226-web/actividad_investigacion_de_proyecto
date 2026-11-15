'use client'

import type { ImageLoaderProps } from 'next/image'

export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src
  }
  const params = new URLSearchParams()
  params.set('width', String(width))
  if (quality) params.set('quality', String(quality))
  const separator = src.includes('?') ? '&' : '?'
  return `${src}${separator}${params.toString()}`
}
