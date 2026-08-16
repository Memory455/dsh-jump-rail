import { describe, expect, it } from 'vitest'
import { assistantTextOf, contentTextOf, truncate } from '../src/client/jump-rail.tsx'

describe('summary helpers', () => {
  it('truncates and flattens long text', () => {
    const long = `line1
line2   line3 ${'x'.repeat(100)}`
    const out = truncate(long, 80)
    expect(out).toHaveLength(80 + 1) // 80 chars + ellipsis
    expect(out.endsWith('…')).toBe(true)
    expect(out.includes('\n')).toBe(false)
  })

  it('keeps short text verbatim (flattened)', () => {
    expect(truncate('  a   b  ')).toBe('a b')
  })

  it('extracts the first text block of user content', () => {
    expect(contentTextOf([
      { type: 'image', attachment: {} as never },
      { type: 'text', text: '  你好 世界  ' },
      { type: 'text', text: 'later' },
    ])).toBe('你好 世界')
    expect(contentTextOf(undefined)).toBe('')
  })

  it('labels image-only user content', () => {
    expect(contentTextOf([{ type: 'image', attachment: {} as never }])).toBe('[图片]')
  })

  it('extracts the first assistant text block', () => {
    expect(assistantTextOf([
      { kind: 'tool-call' },
      { kind: 'text', text: '回答内容' },
    ])).toBe('回答内容')
    expect(assistantTextOf([{ kind: 'tool-call' }])).toBe('[工具调用]')
    expect(assistantTextOf(undefined)).toBe('')
  })
})
