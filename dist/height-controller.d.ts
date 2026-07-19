export interface HtmlArtifactHeightMeasurement {
    baseHeight: number;
    clientHeight: number;
    scrollHeight: number;
}
export interface HtmlArtifactPublishedSize {
    height: number;
    width: number;
}
export interface HtmlArtifactHeightController {
    invalidate(): void;
    resolve(measurement: HtmlArtifactHeightMeasurement): number;
    shouldPublish(size: HtmlArtifactPublishedSize): boolean;
}
/**
 * Owns the complete iframe height negotiation state. The function is deliberately self-contained:
 * the sandbox runtime serializes this factory into generated iframe documents, while tests exercise
 * the same implementation directly.
 */
export declare function createHtmlArtifactHeightController(maxReportedHeight: number): HtmlArtifactHeightController;
//# sourceMappingURL=height-controller.d.ts.map