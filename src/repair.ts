import type { HtmlArtifactDescriptor, HtmlArtifactPatchType } from './protocol'
import { HTML_ARTIFACT_PROTOCOL_VERSION } from './protocol'

export type HtmlArtifactRuntimeErrorPhase = 'protocol' | 'render' | 'patch' | 'script' | 'window'

export interface HtmlArtifactRuntimeError {
  message: string
  phase?: HtmlArtifactRuntimeErrorPhase
  patchType?: HtmlArtifactPatchType
  patchId?: string
}

export interface HtmlArtifactRepairRequestInput {
  artifact: HtmlArtifactDescriptor
  protocolText: string
  errors: readonly HtmlArtifactRuntimeError[]
  maxProtocolTextLength?: number
  maxErrorCount?: number
  maxErrorMessageLength?: number
  maxErrorMetadataLength?: number
}

export interface HtmlArtifactRepairRequest {
  artifactId: string
  title: string
  prompt: string
}

const DEFAULT_REPAIR_PROTOCOL_TEXT_LENGTH = 24_000
const DEFAULT_REPAIR_ERROR_COUNT = 8
const DEFAULT_REPAIR_ERROR_MESSAGE_LENGTH = 2_000
const DEFAULT_REPAIR_ERROR_METADATA_LENGTH = 160

function normalizeRepairText(value: string): string {
  return value.replace(/\r\n/g, '\n').trim()
}

function truncateRepairText(value: string, maxLength: number, minimumLength = 200): string {
  const normalized = normalizeRepairText(value)
  const limit = Math.max(minimumLength, Math.round(maxLength))

  if (normalized.length <= limit) return normalized

  return `${normalized.slice(0, limit)}\n...[已截断 ${normalized.length - limit} 字符]`
}

function formatRuntimeError(
  error: HtmlArtifactRuntimeError,
  index: number,
  options: {
    maxErrorMessageLength: number
    maxErrorMetadataLength: number
  }
): string {
  const fields = [
    `message=${JSON.stringify(truncateRepairText(error.message, options.maxErrorMessageLength, 40))}`,
  ]

  if (error.phase) fields.push(`phase=${error.phase}`)
  if (error.patchType) fields.push(`patchType=${error.patchType}`)
  if (error.patchId) {
    fields.push(
      `patchId=${JSON.stringify(truncateRepairText(error.patchId, options.maxErrorMetadataLength, 1))}`
    )
  }

  return `${index + 1}. ${fields.join(' ')}`
}

export function buildHtmlArtifactRepairRequest({
  artifact,
  protocolText,
  errors,
  maxProtocolTextLength = DEFAULT_REPAIR_PROTOCOL_TEXT_LENGTH,
  maxErrorCount = DEFAULT_REPAIR_ERROR_COUNT,
  maxErrorMessageLength = DEFAULT_REPAIR_ERROR_MESSAGE_LENGTH,
  maxErrorMetadataLength = DEFAULT_REPAIR_ERROR_METADATA_LENGTH,
}: HtmlArtifactRepairRequestInput): HtmlArtifactRepairRequest {
  const selectedErrors = errors.slice(0, Math.max(1, Math.round(maxErrorCount)))
  const formattedErrors = selectedErrors.length === 0
    ? '1. message="Unknown HTML Artifact runtime error"'
    : selectedErrors
        .map((error, index) =>
          formatRuntimeError(error, index, {
            maxErrorMessageLength,
            maxErrorMetadataLength,
          })
        )
        .join('\n')
  const clippedProtocolText = truncateRepairText(protocolText, maxProtocolTextLength)

  return {
    artifactId: artifact.id,
    title: artifact.title,
    prompt: [
      '你正在执行 HTML Artifact 异步修复收尾请求。',
      '不要调用工具，不要继续 ReAct，不要解释过程；只输出一个修复后的 <artifact> 协议块。',
      `Artifact: id=${JSON.stringify(artifact.id)} title=${JSON.stringify(artifact.title)}`,
      '要求：',
      `- 输出必须是完整闭合的 <artifact version="${HTML_ARTIFACT_PROTOCOL_VERSION}" id="${artifact.id}" title="${artifact.title}">...</artifact>。`,
      '- 使用简洁标签 <patch>；不要输出 Markdown 代码块、doctype、html、head、body。',
      '- 用一个完整 <patch type="replace"> 修复最终 DOM；需要样式时输出完整 <patch type="style" id="...">。',
      '- 需要 JS 时输出 <patch type="script" id="...">，脚本必须幂等，不能依赖未创建的 DOM 节点。',
      '- 如果 HTML/CSS/JS 内容里需要出现 </patch>、</artifact> 或其他协议敏感片段，使用 encoding="base64" 输出该 patch 的 UTF-8 base64 内容。',
      '- 如果原内容无法可靠修复，输出一个可渲染的降级版本，说明错误状态但不要暴露协议细节。',
      '',
      '运行时错误：',
      formattedErrors,
      '',
      '原始协议文本：',
      clippedProtocolText,
    ].join('\n'),
  }
}
