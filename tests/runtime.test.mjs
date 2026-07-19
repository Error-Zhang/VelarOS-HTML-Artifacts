import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  buildHtmlArtifactShellDocument,
  HTML_ARTIFACT_WHEEL_MESSAGE_TYPE,
  inferHtmlArtifactContentKind,
  normalizeHtmlArtifactExternalUrl,
  normalizeHtmlArtifactSource,
  resolveHtmlArtifactFrameFit,
} from '../dist/runtime.js'

describe('HTML artifact runtime', () => {
  test('normalizes whole-source wrappers without touching ordinary HTML', () => {
    assert.equal(normalizeHtmlArtifactSource('<main>Ready</main>'), '<main>Ready</main>')
    assert.equal(
      normalizeHtmlArtifactSource('<![CDATA[<style>body{color:red}</style>]]>'),
      '<style>body{color:red}</style>'
    )
    assert.equal(normalizeHtmlArtifactSource('```html\n<svg></svg>\n```'), '<svg></svg>')
    assert.equal(inferHtmlArtifactContentKind('```svg\n<svg></svg>\n```'), 'svg')
  })

  test('accepts explicit web URLs and rejects active or relative schemes', () => {
    assert.equal(normalizeHtmlArtifactExternalUrl('https://example.com/a'), 'https://example.com/a')
    assert.equal(normalizeHtmlArtifactExternalUrl('javascript:alert(1)'), null)
    assert.equal(normalizeHtmlArtifactExternalUrl('/relative'), null)
  })

  test('scales natural dimensions into a stable host viewport', () => {
    assert.deepEqual(
      resolveHtmlArtifactFrameFit({
        fallbackHeight: 360,
        maxViewportWidth: 600,
        naturalHeight: 800,
        naturalWidth: 1200,
      }),
      {
        contentHeight: 800,
        contentWidth: 1200,
        locked: true,
        scale: 0.5,
        viewportHeight: 400,
        viewportWidth: 600,
      }
    )
  })

  test('builds a configurable, product-neutral iframe shell', () => {
    const shell = buildHtmlArtifactShellDocument({
      bridgeMessages: {
        render: 'demo-render',
        generic: 'demo-message',
      },
      rootId: 'demo-root',
    })

    assert.match(shell, /id="demo-root"/)
    assert.match(shell, /demo-render/)
    assert.match(shell, /demo-message/)
    assert.match(shell, /window\.artifactBridge/)
    assert.match(shell, new RegExp(HTML_ARTIFACT_WHEEL_MESSAGE_TYPE))
    assert.doesNotMatch(shell, /widgetBridge|show_widget/)
  })
})
