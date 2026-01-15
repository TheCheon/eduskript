/**
 * Next.js Instrumentation
 *
 * Runs once when the server starts. Used for initializing
 * server-side services like metrics collection.
 */

export async function register() {
  // Only run on the server (not during build or in edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startMetricsFlush } = await import('@/lib/metrics')
    startMetricsFlush()
  }
}
