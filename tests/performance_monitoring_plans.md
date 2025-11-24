  Benchmarking Canvas Drawing Performance: Focused Guide

  Your Key Concerns

  1. Drawing Lag/Latency

  What to Measure:
  - Input Latency: Time from pen touch to first pixel rendered (target: < 50ms)
  - Frame Rate: Maintain 60 FPS during drawing (16.67ms per frame budget)
  - Draw Operation Time: How long each pointer event handler takes

  Current State in Your Code:
  You already have some performance instrumentation in place:
  - annotation-layer.tsx tracks pan/zoom/touch operations
  - simple-canvas.tsx logs coalesced events and stroke data sizes
  - BUT: No metrics on the critical drawing path (pointer events → canvas rendering)

  ---
  Browser-Based Approaches (No CI/CD Required)

  A. Performance API (Already Partially Used)

  How it works:
  // Before operation
  performance.mark('operation-start')

  // ... do work ...

  // After operation
  performance.mark('operation-end')
  performance.measure('Operation Name', 'operation-start', 'operation-end')

  // View in Chrome DevTools → Performance → User Timings
  // Or programmatically:
  const measures = performance.getEntriesByType('measure')
  console.log(measures[0].duration) // milliseconds

  Where to add in your code:

  1. Input Latency (Critical):
  // In simple-canvas.tsx, startDrawing function:
  const startDrawing = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    performance.mark('input-start') // ← Add this

    // ... existing pointerdown logic ...

    currentPathRef.current = [{ x, y, pressure }]
  }, [dependencies])

  // In scheduleIncrementalDraw:
  const scheduleIncrementalDraw = useCallback(() => {
    if (drawRafRef.current === null) {
      drawRafRef.current = requestAnimationFrame(() => {
        performance.mark('input-end') // ← Add this
        performance.measure('Input Latency', 'input-start', 'input-end')

        // Log if slow
        const measure = performance.getEntriesByName('Input Latency')[0]
        if (measure.duration > 50) {
          console.warn(`⚠️ Slow input: ${measure.duration.toFixed(2)}ms`)
        }

        // ... existing RAF code ...
      })
    }
  }, [dependencies])

  2. Draw Handler Duration:
  // In simple-canvas.tsx, draw function:
  const draw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    performance.mark('draw-start')

    // ... existing drawing code ...

    performance.mark('draw-end')
    performance.measure('Draw Handler', 'draw-start', 'draw-end')
  }, [dependencies])

  3. Frame Rate Tracking:
  // Add to annotation-layer.tsx:
  const fpsRef = useRef({ lastTime: 0, frames: 0, fps: 60 })

  useEffect(() => {
    let rafId: number

    const trackFPS = (timestamp: number) => {
      fpsRef.current.frames++

      if (timestamp >= fpsRef.current.lastTime + 1000) {
        const fps = Math.round(
          (fpsRef.current.frames * 1000) / (timestamp - fpsRef.current.lastTime)
        )

        if (fps < 55) {
          console.warn(`⚠️ Frame drop: ${fps} FPS`)
        } else {
          console.log(`✓ ${fps} FPS`)
        }

        fpsRef.current.fps = fps
        fpsRef.current.frames = 0
        fpsRef.current.lastTime = timestamp
      }

      if (mode !== 'view') {
        rafId = requestAnimationFrame(trackFPS)
      }
    }

    if (mode !== 'view') {
      rafId = requestAnimationFrame(trackFPS)
    }

    return () => cancelAnimationFrame(rafId)
  }, [mode])

  Viewing Results:
  1. Open Chrome DevTools → Performance tab
  2. Click Record → Draw on canvas → Stop
  3. Check "User Timing" track to see your marks/measures
  4. Or just watch console.log() output in real-time

  ---
  B. Chrome DevTools Performance Profiling (Manual)

  When to use: When you notice lag and want to understand WHY

  How to use:
  1. Open DevTools → Performance tab
  2. Enable "Screenshots" and "Web Vitals"
  3. Click Record (red button)
  4. Draw on the canvas (reproduce the lag)
  5. Stop recording (stop button)

  What to look for:
  - Main thread activity: Should show your pointer event handlers
    - Look for long yellow blocks (JavaScript execution > 50ms)
    - Your marks/measures will show up as flags on the timeline
  - Frame rate graph (top of recording):
    - Green bars = 60 FPS ✓
    - Yellow/red bars = frame drops ⚠️
  - Bottom-up analysis:
    - Sort by "Self Time" to find hotspots
    - Look for isPointNearStroke, smoothPoints, redrawCanvas
  - Call tree:
    - Click on a long task
    - See exactly which function took the most time

  Example findings:
  - "45ms spent in isPointNearStroke" → eraser collision detection is slow
  - "30ms spent in smoothPoints" → smoothing algorithm needs optimization
  - "Layout recalculation 20ms" → you're triggering unwanted reflows

  ---
  Automated Testing for Regression Prevention

  Since you want to prevent regressions, here's how to set up automated benchmarks:

  Playwright Performance Testing (Recommended)

  Why Playwright:
  - Runs in real browsers (Chrome/Firefox/WebKit)
  - Can simulate realistic user interactions (pen/touch events)
  - Works in CI/CD (headless mode)
  - Captures real performance data

  Setup:
  pnpm add -D @playwright/test
  pnpm exec playwright install

  Basic Performance Test:

  Create tests/performance/drawing-latency.spec.ts:
  import { test, expect } from '@playwright/test'

  test('measures drawing input latency', async ({ page }) => {
    // Navigate to annotation page
    await page.goto('http://localhost:3000/test-page')

    // Wait for canvas to be ready
    const canvas = await page.locator('canvas.annotation-canvas')
    await canvas.waitFor()

    // Simulate drawing a stroke
    await page.evaluate(() => {
      performance.clearMarks()
      performance.clearMeasures()
    })

    // Draw 20 points (simulating pen movement)
    await canvas.click({ position: { x: 100, y: 100 } })

    for (let i = 0; i < 20; i++) {
      await page.mouse.move(100 + i * 10, 100 + i * 5)
      await page.waitForTimeout(16) // Simulate 60 FPS drawing speed
    }

    await page.mouse.up()

    // Collect performance metrics
    const metrics = await page.evaluate(() => {
      const measures = performance.getEntriesByType('measure')
      const inputLatencies = measures
        .filter(m => m.name === 'Input Latency')
        .map(m => m.duration)

      return {
        avgInputLatency: inputLatencies.length > 0
          ? inputLatencies.reduce((a, b) => a + b) / inputLatencies.length
          : 0,
        maxInputLatency: Math.max(...inputLatencies, 0),
        sampleCount: inputLatencies.length
      }
    })

    console.log('Performance Metrics:', metrics)

    // Assertions (these will fail the test if exceeded)
    expect(metrics.avgInputLatency).toBeLessThan(50) // 50ms average
    expect(metrics.maxInputLatency).toBeLessThan(100) // 100ms worst case
  })

  Run locally:
  pnpm exec playwright test tests/performance

  View results:
  pnpm exec playwright show-report

  ---
  CI/CD Integration (GitHub Actions)

  Create .github/workflows/performance-tests.yml:
  name: Performance Tests

  on:
    pull_request:
    push:
      branches: [main]

  jobs:
    performance:
      runs-on: ubuntu-latest

      steps:
        - uses: actions/checkout@v4

        - name: Setup pnpm
          uses: pnpm/action-setup@v2

        - name: Setup Node
          uses: actions/setup-node@v4
          with:
            node-version: '22'
            cache: 'pnpm'

        - name: Install dependencies
          run: pnpm install

        - name: Install Playwright browsers
          run: pnpm exec playwright install --with-deps chromium

        - name: Start dev server
          run: pnpm dev &

        - name: Wait for server
          run: npx wait-on http://localhost:3000

        - name: Run performance tests
          run: pnpm exec playwright test tests/performance

        - name: Upload test results
          uses: actions/upload-artifact@v4
          if: always()
          with:
            name: performance-results
            path: playwright-report/

        - name: Fail if performance degraded
          run: |
            # Compare with baseline and fail if regression > 20%
            node tests/performance/compare-baseline.js

  What this does:
  - Runs on every PR and push to main
  - Automatically tests performance in CI
  - Fails the build if performance degrades
  - Uploads detailed reports as artifacts

  ---
  Practical Workflow: Catching Regressions

  Step 1: Establish Baseline

  # Run tests and save baseline
  pnpm exec playwright test tests/performance
  cp playwright-report/performance-metrics.json baseline-metrics.json
  git add baseline-metrics.json
  git commit -m "Add performance baseline"

  Step 2: Make Code Changes

  # Work on your feature
  git checkout -b feature/my-feature
  # ... make changes ...

  Step 3: Test Performance

  # Run performance tests locally
  pnpm exec playwright test tests/performance

  # Compare with baseline
  node tests/performance/compare.js \
    --baseline baseline-metrics.json \
    --current playwright-report/performance-metrics.json

  Example output:
  Performance Comparison:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Metric              Baseline  Current   Change
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Input Latency       25ms      28ms      +12% ⚠️
  Draw Handler        8ms       7ms       -12% ✓
  Frame Rate          60 FPS    59 FPS    -1.7% ✓
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️  Warning: Input latency increased by 12%

  Step 4: Fix or Accept

  If performance degraded:
  - Option A: Optimize your code to meet baseline
  - Option B: Update baseline if change is acceptable
  # Update baseline after confirming acceptable performance
  cp playwright-report/performance-metrics.json baseline-metrics.json
  git add baseline-metrics.json
  git commit -m "Update performance baseline (acceptable tradeoff)"

  ---
  Quick Win: Real-Time FPS Monitor

  Add this simple component to see performance in real-time:

  // src/components/annotations/fps-monitor.tsx
  export function FPSMonitor({ mode }: { mode: string }) {
    const [fps, setFps] = useState(60)
    const [avgLatency, setAvgLatency] = useState(0)

    useEffect(() => {
      if (mode === 'view') return

      let frameId: number
      let lastTime = performance.now()
      let frames = 0

      const measure = () => {
        frames++
        const now = performance.now()

        if (now >= lastTime + 1000) {
          const currentFPS = Math.round((frames * 1000) / (now - lastTime))
          setFps(currentFPS)

          // Calculate average input latency
          const measures = performance.getEntriesByName('Input Latency')
          if (measures.length > 0) {
            const avg = measures.reduce((sum, m) => sum + m.duration, 0) / measures.length
            setAvgLatency(avg)
            performance.clearMeasures('Input Latency')
          }

          frames = 0
          lastTime = now
        }

        frameId = requestAnimationFrame(measure)
      }

      frameId = requestAnimationFrame(measure)
      return () => cancelAnimationFrame(frameId)
    }, [mode])

    if (mode === 'view') return null

    return (
      <div className="fixed bottom-4 left-4 bg-black/80 text-white px-3 py-2 rounded text-xs font-mono">
        <div className={fps < 55 ? 'text-red-400' : 'text-green-400'}>
          {fps} FPS {fps < 55 && '⚠️'}
        </div>
        {avgLatency > 0 && (
          <div className={avgLatency > 50 ? 'text-red-400' : 'text-green-400'}>
            {avgLatency.toFixed(1)}ms latency
          </div>
        )}
      </div>
    )
  }

  Add to annotation-layer.tsx:
  return (
    <>
      {/* ... existing JSX ... */}
      <FPSMonitor mode={mode} />
    </>
  )

  Now you'll see real-time FPS and latency while drawing!

  ---
  Summary: Your Action Plan

  For Drawing Lag/Latency:

  Immediate (30 min):
  1. Add performance marks to critical paths in simple-canvas.tsx
  2. Add FPS monitor component
  3. Test manually and watch console/DevTools

  Short-term (2-3 hours):
  1. Install Playwright
  2. Create basic drawing latency test
  3. Run locally and establish baseline

  Long-term (1-2 days):
  1. Add GitHub Actions workflow
  2. Create performance budget rules
  3. Set up automated regression detection

  For Regression Prevention:

  Must have:
  - Playwright performance tests in tests/performance/
  - CI/CD workflow that runs on PRs
  - Baseline metrics file in repo
  - Automated comparison script

  Nice to have:
  - Performance budget configuration
  - Slack/email alerts for regressions
  - Historical performance tracking dashboard

  ---
  Key Takeaway

  You asked about benchmarking "without a browser" - but for DOM/Canvas performance, you need a browser (or at
  least a headless one). The good news is Playwright runs headless browsers in CI, so you get real performance data
   without manual testing.

  The performance marks you add to your code work everywhere:
  - ✅ During development (Chrome DevTools)
  - ✅ In automated tests (Playwright)
  - ✅ In production (Real User Monitoring)

  Would you like me to implement any of these approaches for you?