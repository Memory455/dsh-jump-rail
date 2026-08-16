import { describe, expect, it } from 'vitest'
import { apply } from '../src/invariant.ts'

describe('invariant companion', () => {
  it('applies without assertions', () => {
    expect(apply).toBeTypeOf('function')
    expect(() => apply()).not.toThrow()
  })
})
