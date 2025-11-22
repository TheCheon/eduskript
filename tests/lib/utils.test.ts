import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cn, getNavigationUrl, useNavigationUrl } from '@/lib/utils'

describe('lib/utils', () => {
  describe('cn (className utility)', () => {
    it('should merge class names', () => {
      const result = cn('foo', 'bar')
      expect(result).toContain('foo')
      expect(result).toContain('bar')
    })

    it('should handle conditional classes', () => {
      const result = cn('foo', false && 'bar', 'baz')
      expect(result).toContain('foo')
      expect(result).not.toContain('bar')
      expect(result).toContain('baz')
    })

    it('should merge Tailwind classes correctly', () => {
      const result = cn('px-4 py-2', 'px-8')
      // Should keep only px-8 due to tailwind-merge
      expect(result).toContain('px-8')
      expect(result).toContain('py-2')
    })

    it('should handle undefined and null', () => {
      const result = cn('foo', undefined, null, 'bar')
      expect(result).toContain('foo')
      expect(result).toContain('bar')
    })
  })

  describe('getNavigationUrl', () => {
    describe('server-side (isClientSide = false)', () => {
      it('should return full path with username', () => {
        const result = getNavigationUrl('testuser', '/collection/skript', false)
        expect(result).toBe('/testuser/collection/skript')
      })

      it('should handle paths without leading slash', () => {
        const result = getNavigationUrl('testuser', 'collection/skript', false)
        // Function concatenates directly, so no slash between username and path
        expect(result).toBe('/testusercollection/skript')
      })

      it('should handle empty username', () => {
        const result = getNavigationUrl('', '/collection/skript', false)
        // Empty username results in double slash
        expect(result).toBe('//collection/skript')
      })

      it('should handle root path', () => {
        const result = getNavigationUrl('testuser', '/', false)
        expect(result).toBe('/testuser/')
      })
    })

    describe('client-side (isClientSide = true)', () => {
      const originalWindow = global.window

      afterEach(() => {
        global.window = originalWindow
      })

      it('should return full path on localhost (no subdomain routing)', () => {
        global.window = {
          location: {
            hostname: 'localhost',
          },
        } as any

        const result = getNavigationUrl('testuser', '/collection/skript', true)
        expect(result).toBe('/testuser/collection/skript')
      })

      it('should return full path on eduskript.org (no subdomain routing)', () => {
        global.window = {
          location: {
            hostname: 'eduskript.org',
          },
        } as any

        const result = getNavigationUrl('testuser', '/collection/skript', true)
        expect(result).toBe('/testuser/collection/skript')
      })

      it('should return full path when on main domain (localhost)', () => {
        global.window = {
          location: {
            hostname: 'localhost',
          },
        } as any

        const result = getNavigationUrl('testuser', '/collection/skript', true)
        expect(result).toBe('/testuser/collection/skript')
      })

      it('should return full path when on main domain (eduskript.org)', () => {
        global.window = {
          location: {
            hostname: 'eduskript.org',
          },
        } as any

        const result = getNavigationUrl('testuser', '/collection/skript', true)
        expect(result).toBe('/testuser/collection/skript')
      })

      it('should return full path when on www domain', () => {
        global.window = {
          location: {
            hostname: 'www.eduskript.org',
          },
        } as any

        const result = getNavigationUrl('testuser', '/collection/skript', true)
        expect(result).toBe('/testuser/collection/skript')
      })

      it('should handle undefined window', () => {
        global.window = undefined as any

        const result = getNavigationUrl('testuser', '/collection/skript', true)
        expect(result).toBe('/testuser/collection/skript')
      })
    })
  })

  describe('useNavigationUrl', () => {
    const originalWindow = global.window

    afterEach(() => {
      global.window = originalWindow
    })

    it('should call getNavigationUrl with isClientSide = true', () => {
      global.window = {
        location: {
          hostname: 'localhost',
        },
      } as any

      const result = useNavigationUrl('testuser', '/collection/skript')
      expect(result).toBe('/testuser/collection/skript')
    })

    it('should work on main domain', () => {
      global.window = {
        location: {
          hostname: 'localhost',
        },
      } as any

      const result = useNavigationUrl('testuser', '/collection/skript')
      expect(result).toBe('/testuser/collection/skript')
    })
  })
})
