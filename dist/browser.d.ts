import { type HtmlArtifactProtocolEvent, type HtmlArtifactProtocolLimits, type HtmlArtifactSnapshot } from './protocol.js';
export type HtmlArtifactHostErrorPhase = 'host' | 'protocol' | 'runtime' | 'security';
export interface HtmlArtifactHostError {
    message: string;
    phase: HtmlArtifactHostErrorPhase;
    cause?: unknown;
    patchId?: string;
    patchType?: string;
}
export interface MountHtmlArtifactOptions {
    /** Accessible title applied to the generated iframe. */
    title?: string;
    /** Optional class name applied to the generated iframe. */
    className?: string;
    /** iframe sandbox tokens. Defaults to the deliberately small `allow-scripts`. */
    sandbox?: string;
    /** Height used before the runtime publishes its first measurement. */
    initialHeight?: number;
    /** Smallest height the host will apply after a runtime measurement. */
    minHeight?: number;
    /** Hard height cap. Taller content scrolls inside the iframe. */
    maxHeight?: number;
    /** Product-neutral CSS injected before generated artifact styles. */
    designCss?: string;
    /** Root element id inside the iframe shell. */
    rootId?: string;
    /** Protocol resource limits for hostile or unexpectedly large streams. */
    protocolLimits?: HtmlArtifactProtocolLimits;
    /** URL protocols handed to `onLink`. Defaults to HTTP and HTTPS. */
    allowedLinkProtocols?: readonly string[];
    onMarkdown?: (text: string) => void;
    onPrompt?: (prompt: string) => void;
    onLink?: (url: string) => void;
    onMessage?: (payload: unknown) => void;
    onWheel?: (deltaX: number, deltaY: number) => void;
    onEvent?: (event: HtmlArtifactProtocolEvent) => void;
    onError?: (error: HtmlArtifactHostError) => void;
}
export interface HtmlArtifactController {
    readonly iframe: HTMLIFrameElement;
    /** Resolves after the sandbox shell has loaded and queued render events have been delivered. */
    readonly ready: Promise<HTMLIFrameElement>;
    write(chunk: string): HtmlArtifactProtocolEvent[];
    finish(): HtmlArtifactProtocolEvent[];
    consume(chunks: AsyncIterable<string> | Iterable<string>): Promise<HtmlArtifactSnapshot | null>;
    getSnapshot(artifactId?: string): HtmlArtifactSnapshot | null;
    reset(): void;
    dispose(): void;
}
/**
 * Mount one streaming HTML artifact surface into a DOM element.
 *
 * The controller owns protocol parsing, iframe creation, sandbox transport, height negotiation,
 * action validation, and cleanup. Callers only feed model text and handle explicit capabilities.
 */
export declare function mountHtmlArtifact(target: HTMLElement, options?: MountHtmlArtifactOptions): HtmlArtifactController;
//# sourceMappingURL=browser.d.ts.map