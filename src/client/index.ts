/**
 * Jump-rail client plugin: mounts the vertical dash rail into the shipped
 * `conversation.input.dock` seat (the official session-scoped dock above the
 * composer). The rail itself is a fixed-position overlay anchored to the left
 * edge of the conversation column, rendered through the dock entry.
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { JumpRail } from './jump-rail.tsx'
import { en, zh, type JumpRailKey } from './locales.ts'

/** Locale namespace owned by this plugin. */
const NS = 'jump-rail'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Jump-rail surface copy. */
    'jump-rail': JumpRailKey
  }
}

/** Services required by this plugin. */
export const inject = ['slots', 'locale']

/**
 * Register the jump rail into the composer dock seat. The rail renders itself
 * as a fixed overlay (its dock row contributes nothing to the dock layout).
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'jump-rail: dictionaries')
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'jump-rail',
    order: 0,
    locale: NS,
  }, JumpRail))
}
