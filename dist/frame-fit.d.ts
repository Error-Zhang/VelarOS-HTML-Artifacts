export interface HtmlArtifactFrameFit {
    contentHeight: number;
    contentWidth: number;
    locked: boolean;
    scale: number;
    viewportHeight: number;
    viewportWidth: number;
}
export interface HtmlArtifactFrameFitInput {
    fallbackHeight: number;
    maxViewportWidth?: number | null;
    naturalHeight?: number | null;
    naturalWidth?: number | null;
    preferViewportWidth?: boolean;
}
export declare function resolveHtmlArtifactFrameFit(input: HtmlArtifactFrameFitInput): HtmlArtifactFrameFit;
//# sourceMappingURL=frame-fit.d.ts.map