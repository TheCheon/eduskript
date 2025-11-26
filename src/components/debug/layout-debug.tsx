'use client'

import { useState, useEffect, useRef } from 'react'

export function LayoutDebug() {
  const [measurements, setMeasurements] = useState<Record<string, string>>({})
  const [reportStatus, setReportStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const lastMeasurementsRef = useRef<string>('')

  useEffect(() => {
    const measure = () => {
      const paper = document.getElementById('paper')
      const main = document.querySelector('main')
      const scrollContainer = document.getElementById('scroll-container')

      const m: Record<string, string> = {
        'time': new Date().toLocaleTimeString(),
        'window.innerWidth': `${window.innerWidth}px`,
        'window.innerHeight': `${window.innerHeight}px`,
      }

      if (paper) {
        const rect = paper.getBoundingClientRect()
        m['paper.width'] = `${rect.width.toFixed(0)}px`
        m['paper.left'] = `${rect.left.toFixed(0)}px`
        m['paper.right'] = `${rect.right.toFixed(0)}px`
      }

      if (main) {
        const rect = main.getBoundingClientRect()
        m['main.width'] = `${rect.width.toFixed(0)}px`
        m['main.left'] = `${rect.left.toFixed(0)}px`
        // Get computed padding and box sizing
        const computedStyle = window.getComputedStyle(main)
        m['main.paddingLeft'] = computedStyle.paddingLeft
        m['main.paddingRight'] = computedStyle.paddingRight
        m['main.boxSizing'] = computedStyle.boxSizing
        // Calculate content box width
        const paddingL = parseFloat(computedStyle.paddingLeft) || 0
        const paddingR = parseFloat(computedStyle.paddingRight) || 0
        const contentWidth = rect.width - paddingL - paddingR
        m['main.contentWidth'] = `${contentWidth.toFixed(0)}px`
      }

      if (paper) {
        // Also check paper's computed width
        const computedPaper = window.getComputedStyle(paper)
        m['paper.computedWidth'] = computedPaper.width
      }

      // Check for CSS transforms that might affect measurements
      if (scrollContainer) {
        const scrollTransform = window.getComputedStyle(scrollContainer).transform
        if (scrollTransform && scrollTransform !== 'none') {
          m['scroll.transform'] = scrollTransform
        }
      }
      if (main) {
        const mainTransform = window.getComputedStyle(main).transform
        if (mainTransform && mainTransform !== 'none') {
          m['main.transform'] = mainTransform
        }
      }
      if (paper) {
        const paperTransform = window.getComputedStyle(paper).transform
        if (paperTransform && paperTransform !== 'none') {
          m['paper.transform'] = paperTransform
        }
      }

      // The key question: does paper extend past the visible right edge?
      if (paper) {
        const rect = paper.getBoundingClientRect()
        const rightOverflow = rect.right - window.innerWidth
        m['OVERFLOW_RIGHT'] = rightOverflow > 1 ? `YES (+${rightOverflow.toFixed(0)}px)` : 'none'
        // Also check left edge (should be at main's padding)
        m['LEFT_GAP'] = `${rect.left.toFixed(0)}px`
      }

      setMeasurements(m)

      // Auto-send report when measurements change significantly
      const key = JSON.stringify(m)
      if (key !== lastMeasurementsRef.current && Object.keys(m).length > 0) {
        lastMeasurementsRef.current = key
        sendReport(m)
      }
    }

    const sendReport = async (m: Record<string, string>) => {
      try {
        const res = await fetch('/api/debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ measurements: m })
        })
        if (res.ok) {
          setReportStatus('sent')
        } else {
          setReportStatus('error')
        }
      } catch {
        setReportStatus('error')
      }
    }

    measure()
    const interval = setInterval(measure, 500)
    return () => clearInterval(interval)
  }, [])

  const sendManualReport = async () => {
    setReportStatus('idle')
    try {
      const res = await fetch('/api/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ measurements })
      })
      setReportStatus(res.ok ? 'sent' : 'error')
    } catch {
      setReportStatus('error')
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 99999,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '16px',
      borderRadius: '10px',
      border: '4px solid yellow',
      fontSize: '12px',
      fontFamily: 'monospace',
      maxWidth: '90vw'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: 'yellow', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>LAYOUT DEBUG</span>
        <span style={{
          fontSize: '10px',
          color: reportStatus === 'sent' ? '#6bffb8' : reportStatus === 'error' ? '#ff6b6b' : '#888'
        }}>
          {reportStatus === 'sent' ? '✓ Sent' : reportStatus === 'error' ? '✗ Error' : '...'}
        </span>
      </div>
      {Object.entries(measurements).map(([key, value]) => (
        <div key={key} style={{
          color: key === 'OVERFLOW' && value !== 'none' ? '#ff6b6b' :
                 key.startsWith('paper') ? '#6bffb8' :
                 key.startsWith('main') ? '#6bb8ff' :
                 key.startsWith('scroll') ? '#ffb86b' : 'white'
        }}>
          {key}: {value}
        </div>
      ))}
      <button
        onClick={sendManualReport}
        style={{
          marginTop: '12px',
          padding: '8px 16px',
          backgroundColor: '#4a5568',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          width: '100%',
          fontSize: '12px'
        }}
      >
        Send Report to Server
      </button>
    </div>
  )
}
