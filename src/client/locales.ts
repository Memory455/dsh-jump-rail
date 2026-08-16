/** Locale dictionary namespace owned by the jump-rail plugin. */
export type JumpRailKey =
  | 'rail.aria'
  | 'row.jump'
  | 'row.empty'
  | 'tip.title'
  | 'tip.input'
  | 'tip.output'
  | 'tip.noText'
  | 'tip.image'
  | 'tip.tool'

/** Simplified Chinese dictionary. */
export const zh: Record<JumpRailKey, string> = {
  'rail.aria': '轮次跳转',
  'row.jump': '跳到第 {turn} 轮',
  'row.empty': '暂无轮次',
  'tip.title': '第 {turn} 轮',
  'tip.input': '输入：',
  'tip.output': '输出：',
  'tip.noText': '（无文本）',
  'tip.image': '[图片]',
  'tip.tool': '[工具调用]',
}

/** English dictionary. */
export const en: Record<JumpRailKey, string> = {
  'rail.aria': 'Jump to turn',
  'row.jump': 'Jump to turn {turn}',
  'row.empty': 'No turns',
  'tip.title': 'Turn {turn}',
  'tip.input': 'Input: ',
  'tip.output': 'Output: ',
  'tip.noText': '(no text)',
  'tip.image': '[image]',
  'tip.tool': '[tool call]',
}
