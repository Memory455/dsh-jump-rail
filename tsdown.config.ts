/**
 * Standalone build config for the jump-rail client plugin.
 *
 * Uses the vendored dsh client-bundle preset (shared/tsdown.client.ts, copied
 * from the dsh-web-ui family repo; keep in sync when the dsh version changes):
 * node-half lib/ plus the browser bundle lib/client.js (closure-factory
 * artifact for the GUI's __ModuleLoader__, CSS Modules inlined with
 * auto-injected <style data-plugin>).
 */
import { clientBundle } from './shared/tsdown.client.ts'
import pkg from './package.json' with { type: 'json' }

export default clientBundle(pkg.name, ['src/index.ts', 'src/invariant.ts'], {
  lib: {
    external: [
      '@deepseek-ai/cordis',
      '@deepseek-ai/dsh-client-locale',
      '@deepseek-ai/dsh-client-runtime',
      '@deepseek-ai/dsh-client-ui-conversation',
      '@deepseek-ai/dsh-client-ui-slots',
      '@deepseek-ai/dsh-system-prompt',
    ],
  },
})
