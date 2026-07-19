import type { HtmlArtifactRenderPatch } from './protocol.js';
export type HtmlArtifactContentKind = 'html' | 'svg';
export interface HtmlArtifactBridgeMessages {
    render: string;
    patch: string;
    resize: string;
    sendPrompt: string;
    openLink: string;
    generic: string;
    error: string;
}
export interface HtmlArtifactDocumentOptions {
    contentKind?: HtmlArtifactContentKind;
    designCss?: string;
    svgFitCss?: string;
    bodyStyle?: string;
    bridgeMessages?: Partial<HtmlArtifactBridgeMessages>;
    initialPatches?: readonly HtmlArtifactRenderPatch[];
}
export interface HtmlArtifactShellDocumentOptions extends HtmlArtifactDocumentOptions {
    rootId?: string;
}
/** The iframe asks its host to continue a wheel gesture when the document itself cannot scroll. */
export declare const HTML_ARTIFACT_WHEEL_MESSAGE_TYPE = "velaros:html-artifact-wheel";
export declare function normalizeHtmlArtifactSource(content: string): string;
export declare function inferHtmlArtifactContentKind(content: string): HtmlArtifactContentKind;
export declare function buildHtmlArtifactDocument(rawContent: string, options?: HtmlArtifactDocumentOptions): string;
export declare function buildHtmlArtifactShellDocument(options?: HtmlArtifactShellDocumentOptions): string;
//# sourceMappingURL=shell.d.ts.map