# @velaros/html-artifacts

Shared HTML Artifact protocol and iframe document helpers for VelarOS.

## Responsibility

`@velaros/html-artifacts` owns the reusable parts of streamed HTML Artifact rendering:

- Parse model protocol chunks into renderer-neutral events.
- Build sandbox iframe documents for static HTML export and live DOM patch rendering.
- Detect HTML vs SVG content so callers can apply appropriate frame styles.
- Resolve natural artifact dimensions into a fixed host viewport and scale.
- Normalize iframe-requested external URLs before product surfaces open them.
- Build one-shot repair prompts from failed protocol text and iframe runtime errors.

## Public Imports

Use the package root import:

```ts
import {
  applyHtmlArtifactProtocolChunk,
  buildHtmlArtifactRepairRequest,
  buildHtmlArtifactShellDocument,
  createHtmlArtifactProtocolStreamState,
  finalizeHtmlArtifactProtocol,
  inferHtmlArtifactContentKind,
  normalizeHtmlArtifactExternalUrl,
  resolveHtmlArtifactFrameFit,
} from '@velaros/html-artifacts'
```

The package does not expose private subpath imports.

## Protocol

The model protocol uses concise tags inside the assistant stream:

```html
<artifact version="1" id="page" title="Page">
  <patch type="replace"><main id="app"></main></patch>
  <patch type="append" target="#app"><section>Ready</section></patch>
  <patch type="style" id="base">#app{display:grid;}</patch>
  <patch type="script" id="boot">window.appBooted=true;</patch>
  <patch type="script" id="escaped" encoding="base64">d2luZG93LnRva2VuPSc8L3BhdGNoPic7</patch>
</artifact>
```

HTML patches emit only at safe closed-element boundaries, including HTML void tags such as `img`, `input`, and `br`. Targeted append patches can stream one completed element at a time. Style patches emit at complete CSS rule boundaries. Script patches execute only after the script patch closes and should be idempotent.

The current protocol version is `1`. New model output should include `version="1"` on the opening `artifact` tag. Missing versions are treated as v1 for backwards compatibility. Unsupported versions are treated as ordinary Markdown text.

The opening `artifact` tag must include a stable `id` or `artifactId`. Tags without a valid id are treated as ordinary Markdown text, which prevents accidental protocol activation when a reply is explaining tag syntax.

Use `encoding="base64"` when a patch body must contain protocol-sensitive text such as `</patch>` or `</artifact>`. The parser decodes the UTF-8 base64 payload before emitting renderer events. Encoded patches emit only after the patch closes.

Runtime errors are reported through the iframe bridge with `message`, `phase`, `patchType`, and `patchId` when available. Product surfaces can pass the collected protocol text and errors to `buildHtmlArtifactRepairRequest` for an isolated one-shot repair turn.

Protocol artifact events include the cumulative raw `protocolText` for that artifact. Renderer surfaces should persist it with the rendered block so iframe runtime errors can be paired with the exact model protocol text that produced the failed DOM.

Parser-level protocol diagnostics are emitted as `artifact-diagnostic` events. Hosts should persist them with the artifact block and feed them into the same idle repair queue used for iframe runtime errors. Diagnostics are for malformed protocol payloads, such as an invalid base64 patch body; they should not interrupt streaming or throw in the renderer.

Renderer integrations should treat repair as best-effort cleanup, not as part of the active ReAct/tool loop. Queue repair errors while the run or artifact stream is active, dispatch only after the transcript is idle, bound pending error count, runtime error text, metadata, and stored protocol text, serialize repair dispatches so only one repair turn is in flight, and cap repair dispatches per artifact so a broken repair cannot create an infinite repair loop.

The iframe shell reports synchronous window errors, unhandled promise rejections, script patch exceptions, and dynamically activated script load failures through the same error channel. Script patches should still be idempotent and handle expected missing DOM states themselves; the runtime error channel is for unexpected failures and repair handoff.

Scripts embedded in HTML snippets are reactivated only as inline scripts. `src` attributes are copied to `data-blocked-src` instead of being loaded, so dynamic behavior should use inline `script` patches rather than external script URLs.

Artifact code may request a host-level external navigation through `openLink(url)`. Product surfaces should pass that value through `normalizeHtmlArtifactExternalUrl` before calling host APIs such as `window.open`. The default allowlist accepts only explicit `http:` and `https:` URLs; hosts can pass an explicit protocol allowlist when a narrower or broader product policy is needed.

## Sizing

The iframe shell reports natural content width and height after render and after queued patches settle. Product surfaces should fit that natural size inside the Markdown message width:

- Use natural height from the artifact content.
- Use natural width when it fits the Markdown container.
- Treat the first measured Markdown container width as the artifact's maximum host width.
- Scale width and height by the same ratio when natural width exceeds that maximum host width.
- Keep streaming artifacts measurable until the artifact stream closes, then freeze the last stable fit once. Later DOM patches should update inside that frozen viewport and must not resize the surrounding transcript.

`resolveHtmlArtifactFrameFit` is the shared pure helper for this calculation. It returns the unscaled content size for the iframe, the scaled host viewport size, the scale factor, and whether the frame has enough measurements to lock. Hosts should apply `contentWidth/contentHeight` to the iframe, apply `scale` with a top-left transform, and reserve `viewportWidth/viewportHeight` on the outer block.

## Limits

The pure parser accepts optional `limits` on `createHtmlArtifactProtocolStreamState`. Defaults are intentionally high for normal artifacts, but callers can lower them for tests or constrained hosts:

- `maxBufferLength` caps retained partial protocol text that has not yet formed a complete tag.
- `maxArtifactProtocolTextLength` caps raw protocol text kept for repair.
- `maxArtifactHtmlLength` caps retained root HTML snapshots.
- `maxActionPayloadLength` caps the current patch payload.

Patch `target` and `id` metadata is also normalized before renderer handoff: surrounding whitespace is removed, empty style/script ids fall back to `default`, and long metadata is clipped to a small bounded size. This prevents malformed selectors or ids from becoming unbounded DOM/querySelector inputs.

When a cap is hit, the parser clips retained data instead of throwing. This keeps the chat renderer responsive under malformed or oversized streams; repair can still produce a degraded artifact from the retained prefix and runtime error details.

## Boundary

This package intentionally has no React, ChatSession, IPC, Electron, or tool-renderer dependency. Product surfaces should adapt emitted protocol events into their own state model at the boundary.
