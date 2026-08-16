# @memory455/dsh-jump-rail · Conversation Jump Rail

[简体中文](./README.md) | English

A lightweight conversation navigator for the DSH Web GUI. It adds a vertical rail of short markers to the left side of the chat, making it easy to see your current turn and jump around long conversations.

![Conversation jump rail preview](https://raw.githubusercontent.com/Memory455/dsh-jump-rail/main/overview.png)

## Features

- Displays one persistent marker for each conversation turn;
- Highlights the turn currently in the viewport with a brighter, thicker, and longer marker;
- Shows an input and output summary when you hover over a marker;
- Jumps directly to a turn's input when you click its marker;
- Appears only in chat views containing at least two turns;
- Automatically adjusts when the window, sidebar, or conversation content changes.

## Installation

Installing from npm is recommended:

```sh
dsh plugin --profile web add @memory455/dsh-jump-rail
```

You can also install directly from GitHub:

```sh
dsh plugin --profile web add https://github.com/Memory455/dsh-jump-rail
```

To clone the source, build it locally, and install the local build:

```sh
# Clone the source
git clone https://github.com/Memory455/dsh-jump-rail.git
cd dsh-jump-rail

# Install dependencies and build
pnpm install
pnpm build

# Link the plugin to the DSH Web profile
dsh plugin --profile web add link:$PWD
```

Restart DSH Web after installation to activate the plugin.

## Usage

Open a chat containing at least two conversation turns. The jump rail appears automatically on the left side of the conversation:

- As you scroll, the marker for the current turn is highlighted automatically;
- Hover over a marker to preview that turn's input and output;
- Click any marker to jump back to its corresponding turn.

The jump rail hides automatically when you switch to a non-chat view, such as the trajectory view.

<details>
<summary>Development and build</summary>

```sh
# Install dependencies
pnpm install

# Typecheck, test, and build
pnpm typecheck
pnpm test
pnpm build

# Watch source files for changes
pnpm watch
```

After building locally, link the current directory to the DSH Web profile:

```sh
dsh plugin --profile web add link:$PWD
```

Restart DSH Web after linking the plugin.

</details>

## License

[Apache-2.0](./LICENSE)
