'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body className="grid min-h-screen place-items-center bg-[#F2F6F1] p-6 text-[#17251B]">
        <main className="w-full max-w-md rounded-xl border border-[#CBD8CB] bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#2F6B3F]">
            EcoCert 360
          </p>
          <h1 className="mt-4 text-2xl font-semibold">No pudimos cargar esta vista</h1>
          <p className="mt-3 text-sm leading-6 text-[#5B6B5F]">
            Ocurrió un error temporal. Intenta cargar nuevamente la plataforma.
          </p>
          <button
            className="mt-6 min-h-11 rounded-lg bg-[#2F6B3F] px-5 text-sm font-semibold text-white"
            onClick={reset}
            type="button"
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  )
}
