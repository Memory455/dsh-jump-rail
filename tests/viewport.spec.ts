import { describe, expect, it } from 'vitest'
import { nearestVisibleTurn } from '../src/client/jump-rail.tsx'

describe('viewport turn selection', () => {
  it('selects the row crossing the top reading line', () => {
    expect(nearestVisibleTurn(
      { top: 100, bottom: 500 },
      [
        { turn: 1, top: 80, bottom: 180 },
        { turn: 2, top: 180, bottom: 280 },
      ],
    )).toBe(1)
  })

  it('keeps the nearest adjacent turn when the reading line is in a gap', () => {
    expect(nearestVisibleTurn(
      { top: 100, bottom: 500 },
      [
        { turn: 1, top: 90, bottom: 101 },
        { turn: 2, top: 108, bottom: 220 },
      ],
    )).toBe(1)
  })

  it('ignores rows outside the scrollport', () => {
    expect(nearestVisibleTurn(
      { top: 100, bottom: 500 },
      [
        { turn: 1, top: 10, bottom: 90 },
        { turn: 2, top: 510, bottom: 620 },
      ],
    )).toBeNull()
  })
})
