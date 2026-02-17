<p align="center">
  <img src="public/images/logo-transparent.png" alt="Lucid" width="400" />
</p>

<p align="center">
  A browser extension that summarizes web pages and answers questions about them — powered entirely by <a href="https://webllm.mlc.ai/">WebLLM</a>. All inference runs locally in the browser. No server, no API keys, full privacy.
</p>

Works in **Chrome** and **Firefox**.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A browser with [WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) support:
  - **Chrome 113+** — WebGPU enabled by default
  - **Firefox 141+** — enable `dom.webgpu.enabled` in `about:config`

## Setup

```sh
npm install
npm run build
```

## Load the Extension

### Chrome

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select the `dist/` folder
4. Click the extension icon to open the side panel

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on** and select `dist/manifest.json`
3. Open the sidebar via **View > Sidebar > Lucid**

## Usage

- **Summarize page** — generates a summary of the current page
- **Ask a question** — type a question and press Enter
- **Clear** — resets the conversation

The first launch downloads model weights (~1 GB). After that, loads are instant from cache.

## Changing the Model

Edit `MODEL_ID` at the top of `src/main.js`:

```js
const MODEL_ID = 'Qwen3-1.7B-q4f16_1-MLC';
```

Some alternatives:

| Model                               | Size    | Notes          |
| ----------------------------------- | ------- | -------------- |
| `Llama-3.2-1B-Instruct-q4f16_1-MLC` | ~0.6 GB | Fastest        |
| `Qwen3-1.7B-q4f16_1-MLC`            | ~1 GB   | Default        |
| `Qwen2.5-3B-Instruct-q4f16_1-MLC`   | ~2 GB   | Better quality |
| `Phi-3.5-mini-instruct-q4f16_1-MLC` | ~2 GB   | Best quality   |

Rebuild after changing: `npm run build`

## Development

Rebuild automatically on file changes:

```sh
npm run watch
```

Then reload the extension in your browser.
