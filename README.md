# @memory455/dsh-jump-rail · 轮次跳转条

DSH Web GUI 插件：对话记录左侧常驻的**纵向短横线导航条**——每一轮对话一根横线，点击即可跳转到该轮输入位置。

## 功能

- 对话记录左侧（聊天区左缘内侧）常驻竖排短横线，每轮一根、无背景色；
- **当前视口所在轮**的横线更亮/更粗/更长（随滚动实时更新）；
- **悬停**横线显示该轮**输入/输出摘要**（首个非空文本，80 字截断；无文本显示「（无文本）」，图片/工具调用有对应标注）；
- **点击**横线即时跳转到该轮输入位置（含行缺失容错）；
- 仅**多轮（≥2 轮）会话**显示；切到非 chat 视图（如轨迹视图）自动隐藏；
- 侧栏宽度/窗口尺寸变化时自动重新定位；行重装配自愈；插件停用后全部清理。

## 安装（本地开发 / 本机 profile）

```sh
# 构建
pnpm install
pnpm build          # 产物 lib/（lib/index.js 节点半 + lib/client.js 浏览器半）

# 安装进 web profile（link 本地目录）
dsh plugin --profile web add link:$PWD

# 在 ~/.dsh/profiles/web/cordis.patch.yml 追加：
#   - insert:
#       - id: ui-jump-rail
#         name: '@memory455/dsh-jump-rail'

# 重启 dsh web 生效
```

## 从 GitHub 安装

```sh
dsh plugin --profile web add https://github.com/Memory455/dsh-jump-rail
```

## 发布

仓库使用与 dsh-web-ui 相同的 tag 驱动发布方式：推送 `vX.Y.Z` tag 后，GitHub Actions 会完成类型检查、测试、构建、npm 发布和 GitHub Release 创建。

首次发布后，在 npm 包的 `Settings → Trusted Publisher` 中选择 GitHub Actions，并填写：

- Organization or user：`Memory455`
- Repository：`dsh-jump-rail`
- Workflow filename：`release.yml`
- Allowed actions：`npm publish`

配置使用短期 OIDC 凭据，无需在 GitHub 保存长期 npm token。之后确保 `package.json` 的版本与 tag 一致：

```sh
pnpm version patch             # 或 minor / major；首发 0.1.0 无需执行
git push origin main --follow-tags
```

发布后安装：

```sh
dsh plugin --profile web add @memory455/dsh-jump-rail
```

## 开发

```sh
pnpm typecheck      # tsc -b
pnpm test           # vitest
pnpm watch          # tsdown --watch
```

## 架构说明

- **Node 半**（`src/index.ts`）：systemPrompt 段向 agent 宣告插件存在与能力，可通过 cordis.yml 行配置 `enabled` / `announceToAgent` 关闭；
- **浏览器半**（`src/client/`）：注册进官方 `conversation.input.dock` 座位（会话级），以 fixed 覆盖层渲染竖条；样式为 CSS Modules（tsdown 内联，带 `<style data-plugin>` 自动清理）；
- **构建预设**：`shared/tsdown.client.ts` + `shared/web-platform.ts` 拷贝自 [dsh-web-ui](https://github.com/zhu1090093659/dsh-web-ui) 仓库的 `shared/`（升级 dsh 版本时需同步）。

## 依赖

运行时依赖由 dsh 组合提供（`@deepseek-ai/*` 平台模块）；npm 包本身仅 devDependencies 声明（react peer）。

## License

Apache-2.0
