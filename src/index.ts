/**
 * Host loader entry for the jump-rail plugin.
 *
 * Everything the rail does is browser work (DOM, viewport tracking, scrolling
 * the chat), so the host half's only behavior is a system-prompt section
 * announcing the plugin to every agent. The section registers while this
 * plugin is in the host composition (mount / DSH restart) and disappears when
 * it leaves (unmount / restart), so agents always know the rail exists and
 * how to cooperate with it. Both the whole plugin and the announcement can be
 * turned off through the composition entry config.
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-system-prompt'
import z from 'schemastery'

/** Order of the announcement section within the tool-guidance band. */
const SECTION_ORDER = 210

/** Model-facing announcement: plugin presence, capabilities, and limits. */
export const JUMP_RAIL_GUIDANCE = '本机已安装 dsh-jump-rail 插件（DSH Web GUI 的轮次跳转条）：对话记录左侧常驻纵向短横线导航条，每轮一根横线；当前视口所在轮横线更亮/更粗/更长，悬停显示该轮输入/输出摘要，点击任意横线跳转到该轮输入位置。限制：仅多轮（≥2 轮）会话显示；跳转目标为当前窗口内轮次；跳转为视图内定位，不改写会话日志。用户提到「轮次跳转 / 跳转条 / 横线导航」时即指本插件，请据此协作。'

/** Plugin config, validated by the same-named schemastery schema. */
export interface Config {
  /**
   * When true (default), a system-prompt section announces the rail to every
   * agent. Set false to keep it silent in prompts.
   */
  announceToAgent?: boolean
  /** Master switch for the plugin (browser half + host announcement). */
  enabled?: boolean
}

export const Config: z<Config> = z.object({
  announceToAgent: z.boolean().default(true),
  enabled: z.boolean().default(true),
})

/** Services required by this plugin. */
export const inject = ['systemPrompt']

/**
 * Register the rail's announcement section, gated on the composition entry's
 * config; the section lives on the plugin fiber and unwinds with it.
 * @param ctx - the plugin context (systemPrompt injected).
 * @param config - resolved plugin config (schema defaults applied by the loader).
 */
export function apply(ctx: Context, config?: Config): void {
  if ((config?.enabled ?? true) === false) return
  if ((config?.announceToAgent ?? true) === false) return
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'plugin:jump-rail',
    order: SECTION_ORDER,
    text: JUMP_RAIL_GUIDANCE,
  }), 'jump-rail: announcement')
}
