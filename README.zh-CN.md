# VelarOS HTML Artifacts

一个低依赖的 TypeScript 开源库，用于把模型的增量文本输出转换成实时、隔离的 HTML Artifact。

它包含两个明确分离的层次：

- 流式协议解析器：把不完整的模型输出转换为与渲染框架无关的 Artifact/Patch 事件。
- 沙箱运行时：构建 iframe 文档、应用 HTML/CSS/JavaScript 增量补丁、上报错误与自然尺寸，并通过 `postMessage` 把宿主动作交还给外层应用。

本项目由 [Error-Zhang](https://github.com/Error-Zhang) 在构建 VelarOS Desktop 的过程中设计和实现，随后从产品代码中解耦为宿主无关的公共库。仓库保留了原始提交历史。

## 它解决什么问题

流式 HTML 不能简单理解为“不断设置 `innerHTML`”。模型可能停在半个标签、半条 CSS 规则、半段脚本或 UTF-8/Base64 数据中；宿主还必须同时保证不可信代码隔离、聊天布局不振荡、错误可以定位。

本库集中处理这些边界，但不依赖 React、Electron、Agent Loop 或特定模型服务。

## 安装

首次发布 npm 之前，可以固定 GitHub 仓库或具体提交：

```bash
npm install github:Error-Zhang/VelarOS-HTML-Artifacts
```

仓库会提交编译后的 `dist/`，因此即使包管理器不会执行 Git 依赖的 `prepare` 脚本，也能直接消费固定提交。

清单中预留的 npm 包名是 `@velaros/html-artifacts`。

## 使用方式

协议解析：

```ts
import {
  applyHtmlArtifactProtocolChunk,
  createHtmlArtifactProtocolStreamState,
  finalizeHtmlArtifactProtocol,
} from '@velaros/html-artifacts/protocol'

const state = createHtmlArtifactProtocolStreamState({ enabled: true })

for await (const chunk of modelTextStream) {
  for (const event of applyHtmlArtifactProtocolChunk(state, chunk)) {
    renderEvent(event)
  }
}

for (const event of finalizeHtmlArtifactProtocol(state)) {
  renderEvent(event)
}
```

沙箱文档：

```ts
import { buildHtmlArtifactShellDocument } from '@velaros/html-artifacts/runtime'

const iframe = document.createElement('iframe')
iframe.setAttribute('sandbox', 'allow-scripts')
iframe.srcdoc = buildHtmlArtifactShellDocument()
```

## 开源与私有边界

公共仓库只维护可复用机制，不承载 VelarOS 产品策略。以下内容继续由 Desktop 私有层负责：

- 模型系统提示词与工具选择策略；
- 会话状态、持久化、中止恢复与 Agent 调度；
- Electron IPC、Desktop 事件和权限策略；
- 品牌主题、工具栏、全屏层等产品 UI；
- Widget、Memory、Policy 与 VelarOS Kernel 的内部实现。

Widget 和 HTML Artifact 可以共同消费本库的通用 iframe runtime，但本库不知道 Widget 的存在，因此不存在反向依赖。

## 维护方式

公开仓库是唯一源码。通用修复先在这里合入并发布版本，VelarOS Desktop 再升级到准确版本；Desktop 适配层不复制本仓库源码。

```bash
npm install
npm run check
npm run demo
```

## 许可证

MIT © 2026 Error-Zhang
