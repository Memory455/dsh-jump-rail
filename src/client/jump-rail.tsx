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

/**
 * Resolve the turn whose first input row is currently near the top of the
 * conversation scrollport, sampling the same anchored rows ChatView pages by.
 */
function viewportTurn(keyToTurn: Map<string, number>): number | null {
  const scrollport = document.querySelector('[data-conversation-scroll]')
  if (scrollport === null || typeof document.elementsFromPoint !== 'function') return null
  const rect = scrollport.getBoundingClientRect()
  if (rect.height <= 0) return null
  const x = rect.left + Math.min(rect.width / 2, 200)
  const ys = [rect.top + 4, rect.top + Math.max(4, rect.height / 2)]
  for (const y of ys) {
    for (const el of document.elementsFromPoint(x, y)) {
      if (!(el instanceof HTMLElement)) continue
      const row = el.closest('[data-chat-anchor-key]')
      if (!(row instanceof HTMLElement) || row.dataset.chatAnchorKey === undefined) continue
      const turn = keyToTurn.get(row.dataset.chatAnchorKey)
      if (turn !== undefined) return turn
    }
  }
  return null
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

  // Re-measure the scrollport on layout changes (column resize, window
  // resize, session switch remount) and re-anchor the fixed rail.
  useEffect(() => {
    if (turns.length <= 1) return
    const measure = (): void => {
      const scrollport = document.querySelector('[data-conversation-scroll]')
      if (scrollport === null) {
        setAnchor(null)
        return
      }
      const rect = scrollport.getBoundingClientRect()
      setAnchor({ left: rect.left + 4, top: rect.top + rect.height / 2 })
    }
    measure()
    window.addEventListener('resize', measure)
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(measure)
      const scrollport = document.querySelector('[data-conversation-scroll]')
      if (scrollport !== null) observer.observe(scrollport)
    }
    return () => {
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [turns.length])

  // Track chat-row presence so the rail hides on non-chat views instead of
  // answering clicks with nothing (event-driven via a subtree observer).
  useEffect(() => {
    if (turns.length <= 1) return
    const checkRows = (): void => {
      setRowsPresent(document.querySelector('[data-chat-anchor-key]') !== null)
    }
    const scrollport = document.querySelector('[data-conversation-scroll]')
    let observer: MutationObserver | null = null
    if (scrollport !== null && typeof MutationObserver === 'function') {
      observer = new MutationObserver(checkRows)
      observer.observe(scrollport, { childList: true, subtree: true })
    }
    checkRows()
    return () => { observer?.disconnect() }
  }, [turns.length])

  // Follow the viewport: recompute the current turn on scroll (rAF
  // throttled) and once on mount; identical values bail out of re-render.
  useEffect(() => {
    if (turns.length <= 1 || keyToTurn.size === 0) return
    const scrollport = document.querySelector('[data-conversation-scroll]')
    if (scrollport === null) return
    let raf = 0
    const onScroll = (): void => {
      if (raf !== 0) return
      raf = requestAnimationFrame(() => {
        raf = 0
        setActiveTurn(viewportTurn(keyToTurn))
      })
    }
    scrollport.addEventListener('scroll', onScroll, { passive: true })
    setActiveTurn(viewportTurn(keyToTurn))
    return () => {
      scrollport.removeEventListener('scroll', onScroll)
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
