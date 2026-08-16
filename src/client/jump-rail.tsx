/**
 * Jump rail: a persistent vertical dash rail anchored to the left edge of the
 * conversation column. One dash per completed turn; the turn currently in the
 * viewport is highlighted (brighter/thicker/longer); hovering a dash shows
 * that turn's input/output summary; clicking a dash scrolls the chat to that
 * turn's input. Hidden until there are at least two turns, and while no chat
 * rows are mounted (non-chat views).
 */

import { memo, useEffect, useMemo, useState } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the ui-conversation SlotMap merge (conversation.input.dock).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { JumpRailKey } from './locales.ts'
import css from './jump-rail.module.css'

/** Structural user content block (read-only leaf access). */
interface ContentBlockLike {
  type?: string
  text?: string
  attachment?: unknown
}

/** Collapse whitespace and cap a summary line. */
export function truncate(text: string, max = 80): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max)}…` : flat
}

/** First non-empty text of a user content block list (image fallback label). */
export function contentTextOf(content: readonly ContentBlockLike[] | undefined): string {
  if (content === undefined) return ''
  let image = false
  for (const block of content) {
    if (block.type === 'text' && typeof block.text === 'string' && block.text.trim() !== '') {
      return truncate(block.text)
    }
    if (block.type === 'image') image = true
  }
  return image ? '[图片]' : ''
}

/** First non-empty text of the classified assistant blocks (tool fallback). */
export function assistantTextOf(
  blocks: readonly { kind?: string; text?: string }[] | undefined,
): string {
  if (blocks === undefined) return ''
  let tool = false
  for (const block of blocks) {
    if (block.kind === 'text' && typeof block.text === 'string' && block.text.trim() !== '') {
      return truncate(block.text)
    }
    if (block.kind === 'tool-call') tool = true
  }
  return tool ? '[工具调用]' : ''
}

/** Narrow chat read-face the rail consumes (leaf fields only). */
interface ChatLike {
  timeline: { turnOrder: readonly number[] }
  locations: { getTurn(turn: number): readonly string[] }
}

interface ViewportTurn {
  turn: number
  x: number
  y: number
}

interface VerticalRect {
  top: number
  bottom: number
}

interface TurnRect extends VerticalRect {
  turn: number
}

/**
 * Pick the visible turn nearest the scrollport's top reading line. A row that
 * crosses the line wins; inside a gap, the closest adjacent row wins. Keeping
 * this geometry calculation pure makes the intermittent viewport cases
 * testable without depending on elementsFromPoint.
 */
export function nearestVisibleTurn(
  viewport: VerticalRect,
  rows: readonly TurnRect[],
): number | null {
  const probe = viewport.top + 4
  let bestTurn: number | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const row of rows) {
    if (row.bottom <= viewport.top || row.top >= viewport.bottom) continue
    const distance = row.top <= probe && row.bottom >= probe
      ? 0
      : row.top > probe
        ? row.top - probe
        : probe - row.bottom
    if (distance < bestDistance) {
      bestDistance = distance
      bestTurn = row.turn
    }
  }
  return bestTurn
}

/**
 * Resolve the turn whose anchored row is at or nearest the top of the
 * conversation scrollport.
 */
function viewportTurn(scrollport: HTMLElement, keyToTurn: Map<string, number>): number | null {
  const rect = scrollport.getBoundingClientRect()
  if (rect.height <= 0) return null
  const rows: TurnRect[] = []
  for (const row of scrollport.querySelectorAll<HTMLElement>('[data-chat-anchor-key]')) {
    const key = row.dataset.chatAnchorKey
    if (key === undefined) continue
    const turn = keyToTurn.get(key)
    if (turn === undefined) continue
    const rowRect = row.getBoundingClientRect()
    rows.push({ turn, top: rowRect.top, bottom: rowRect.bottom })
  }
  return nearestVisibleTurn(rect, rows)
}

/** Jump to the first row of the turn that actually exists in the DOM, landing
 *  instantly (a smooth animation can be hijacked by the chat view's
 *  bottom-follow while the model streams). */
function jumpTo(chat: ChatLike, turn: number): void {
  const keys = chat.locations.getTurn(turn)
  for (const key of keys) {
    for (const row of document.querySelectorAll('[data-chat-anchor-key]')) {
      if (row instanceof HTMLElement && row.dataset.chatAnchorKey === key) {
        row.scrollIntoView({ behavior: 'auto', block: 'start' })
        return
      }
    }
  }
}

/** Full props of the dock entry: the session-scoped runtime share + locale. */
export type JumpRailProps = PropsRuntime<'conversation.input.dock'> & PropsLocale<'jump-rail'>

/**
 * The dock entry component: measures the scrollport, tracks the viewport
 * turn, self-heals when chat rows re-assemble, and renders the rail + hover
 * summary.
 */
export const JumpRail = memo(function JumpRail({ useSession, t }: JumpRailProps) {
  const chat = useSession((s) => s.chat)
  const { turns, keyToTurn, summaries } = useMemo(() => {
    const turns: number[] = []
    const keyToTurn = new Map<string, number>()
    const summaries = new Map<number, { input: string; output: string }>()
    for (const turn of chat.timeline.turnOrder) {
      const keys = chat.locations.getTurn(turn)
      if (keys.length === 0) continue
      turns.push(turn)
      let input = ''
      let output = ''
      for (const key of keys) {
        keyToTurn.set(key, turn)
        const node = chat.nodes.get(key)
        if (node === undefined) continue
        const data = node.data as { content?: readonly ContentBlockLike[]; blocks?: readonly { kind?: string; text?: string }[] }
        if (input === '' && (node.kind === 'user' || node.kind === 'steering' || node.kind === 'context')) {
          input = contentTextOf(data.content)
        } else if (output === '' && node.kind === 'assistant-step') {
          output = assistantTextOf(data.blocks)
        }
      }
      summaries.set(turn, { input, output })
    }
    return { turns, keyToTurn, summaries }
  }, [chat])
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null)
  const [activeTurn, setActiveTurn] = useState<number | null>(null)
  const [hover, setHover] = useState<ViewportTurn | null>(null)
  // Whether chat rows exist in the DOM right now: the rail is only useful
  // while the chat view is mounted (other views render no anchored rows).
  const [rowsPresent, setRowsPresent] = useState<boolean | null>(null)

  // Keep anchoring, row presence, and active-turn selection in one refresh
  // loop. Besides scroll, row mutations and row resizing matter because
  // streaming output, images, and virtualized remounts can move anchors
  // without emitting a scroll event. The document observer also reconnects
  // listeners when the conversation scrollport itself is replaced.
  useEffect(() => {
    if (turns.length <= 1 || keyToTurn.size === 0) {
      setAnchor(null)
      setRowsPresent(false)
      setActiveTurn(null)
      return
    }
    const turnSet = new Set(turns)
    let scrollport: HTMLElement | null = null
    let raf = 0
    const observedElements = new Set<HTMLElement>()
    const schedule = (): void => {
      if (raf !== 0) return
      raf = requestAnimationFrame(() => {
        raf = 0
        refresh()
      })
    }
    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(schedule)
      : null
    const syncResizeTargets = (next: HTMLElement, rows: readonly HTMLElement[]): void => {
      if (resizeObserver === null) return
      const desired = new Set<HTMLElement>([next, ...rows])
      for (const element of observedElements) {
        if (!desired.has(element)) {
          resizeObserver.unobserve(element)
          observedElements.delete(element)
        }
      }
      for (const element of desired) {
        if (!observedElements.has(element)) {
          resizeObserver.observe(element)
          observedElements.add(element)
        }
      }
    }
    const connect = (next: HTMLElement | null): void => {
      if (next === scrollport) return
      scrollport?.removeEventListener('scroll', schedule)
      scrollport = next
      scrollport?.addEventListener('scroll', schedule, { passive: true })
    }
    const refresh = (): void => {
      const found = document.querySelector('[data-conversation-scroll]')
      connect(found instanceof HTMLElement ? found : null)
      if (scrollport === null) {
        setAnchor(null)
        setRowsPresent(false)
        syncResizeTargets(document.documentElement, [])
        return
      }
      const rect = scrollport.getBoundingClientRect()
      setAnchor(rect.height > 0 ? { left: rect.left + 4, top: rect.top + rect.height / 2 } : null)
      const rows = Array.from(scrollport.querySelectorAll<HTMLElement>('[data-chat-anchor-key]'))
      setRowsPresent(rows.length > 0)
      syncResizeTargets(scrollport, rows)
      const nextTurn = viewportTurn(scrollport, keyToTurn)
      setActiveTurn((current) => nextTurn ?? (
        current !== null && turnSet.has(current) ? current : turns[0] ?? null
      ))
    }
    const mutationObserver = typeof MutationObserver === 'function'
      ? new MutationObserver(schedule)
      : null
    mutationObserver?.observe(document.documentElement, {
      childList: true,
      characterData: true,
      subtree: true,
    })
    window.addEventListener('resize', schedule)
    refresh()
    return () => {
      scrollport?.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      mutationObserver?.disconnect()
      resizeObserver?.disconnect()
      if (raf !== 0) cancelAnimationFrame(raf)
    }
  }, [keyToTurn, turns.length])

  // A single turn leaves nothing to jump between: hide the whole rail.
  if (turns.length <= 1 || anchor === null || rowsPresent === false) return null

  const summary = hover !== null ? summaries.get(hover.turn) : undefined
  return (
    <>
      <div
        className={css.rail}
        style={{ left: anchor.left, top: anchor.top }}
        role="listbox"
        aria-label={t('rail.aria')}
      >
        {turns.map((turn) => (
          <button
            key={turn}
            type="button"
            role="option"
            className={turn === activeTurn ? `${css.row} ${css.rowActive}` : css.row}
            aria-label={t('row.jump', { turn })}
            onClick={() => { jumpTo(chat, turn) }}
            onMouseEnter={(ev) => { setHover({ turn, x: ev.clientX, y: ev.clientY }) }}
            onMouseMove={(ev) => { setHover({ turn, x: ev.clientX, y: ev.clientY }) }}
            onMouseLeave={() => { setHover(null) }}
          >
            <span className={css.dash} aria-hidden />
          </button>
        ))}
      </div>
      {hover !== null && summary !== undefined && (
        <div
          className={css.tip}
          style={{
            left: Math.max(8, Math.min(hover.x + 14, window.innerWidth - 300)),
            top: Math.max(8, Math.min(hover.y + 14, window.innerHeight - 140)),
          }}
        >
          <div className={css.tipTitle}>{t('tip.title', { turn: hover.turn })}</div>
          <div className={css.tipRow}>
            <strong>{t('tip.input')}</strong>
            {summary.input !== '' ? summary.input : t('tip.noText')}
          </div>
          <div className={css.tipRow}>
            <strong>{t('tip.output')}</strong>
            {summary.output !== '' ? summary.output : t('tip.noText')}
          </div>
        </div>
      )}
    </>
  )
})

// Re-export the dictionary key type for consumers.
export type { JumpRailKey }
