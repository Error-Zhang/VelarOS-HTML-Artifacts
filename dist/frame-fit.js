function readPositiveNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}
function toDimension(value) {
    return Math.max(1, Math.ceil(value));
}
export function resolveHtmlArtifactFrameFit(input) {
    const reportedNaturalWidth = readPositiveNumber(input.naturalWidth);
    const naturalHeight = readPositiveNumber(input.naturalHeight);
    const maxViewportWidth = readPositiveNumber(input.maxViewportWidth);
    const naturalWidth = input.preferViewportWidth &&
        maxViewportWidth &&
        (!reportedNaturalWidth || reportedNaturalWidth <= maxViewportWidth)
        ? maxViewportWidth
        : reportedNaturalWidth;
    const fallbackHeight = toDimension(readPositiveNumber(input.fallbackHeight) ?? 1);
    const fallbackWidth = toDimension(maxViewportWidth ?? naturalWidth ?? 1);
    if (!naturalWidth || !naturalHeight || !maxViewportWidth) {
        return {
            contentHeight: fallbackHeight,
            contentWidth: fallbackWidth,
            locked: false,
            scale: 1,
            viewportHeight: fallbackHeight,
            viewportWidth: fallbackWidth,
        };
    }
    const scale = naturalWidth > maxViewportWidth ? maxViewportWidth / naturalWidth : 1;
    const viewportWidth = toDimension(Math.min(naturalWidth, maxViewportWidth));
    const viewportHeight = toDimension(naturalHeight * scale);
    return {
        contentHeight: toDimension(naturalHeight),
        contentWidth: toDimension(naturalWidth),
        locked: true,
        scale,
        viewportHeight,
        viewportWidth,
    };
}
//# sourceMappingURL=frame-fit.js.map