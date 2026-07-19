/**
 * Owns the complete iframe height negotiation state. The function is deliberately self-contained:
 * the sandbox runtime serializes this factory into generated iframe documents, while tests exercise
 * the same implementation directly.
 */
export function createHtmlArtifactHeightController(maxReportedHeight) {
    const heightLimit = Number.isFinite(maxReportedHeight) && maxReportedHeight > 0
        ? Math.max(1, Math.ceil(maxReportedHeight))
        : 1200;
    let contentFloor = 0;
    let feedbackFrozenHeight = 0;
    let previousClientHeight = 0;
    let previousScrollHeight = 0;
    let feedbackSteps = 0;
    let lastPublishedHeight = 0;
    let lastPublishedWidth = 0;
    const clampHeight = (value) => Math.max(1, Math.min(heightLimit, Math.ceil(Number(value) || 1)));
    const normalizeWidth = (value) => Math.max(1, Math.ceil(Number(value) || 1));
    return {
        invalidate() {
            contentFloor = 0;
            feedbackFrozenHeight = 0;
            previousClientHeight = 0;
            previousScrollHeight = 0;
            feedbackSteps = 0;
        },
        resolve(measurement) {
            const baseHeight = Math.max(1, Math.ceil(Number(measurement.baseHeight) || 1));
            const clientHeight = Math.max(0, Math.ceil(Number(measurement.clientHeight) || 0));
            const scrollHeight = Math.max(0, Math.ceil(Number(measurement.scrollHeight) || 0));
            if (feedbackFrozenHeight)
                return feedbackFrozenHeight;
            if (scrollHeight > clientHeight + 1) {
                if (previousClientHeight && clientHeight > previousClientHeight) {
                    const clientGrowth = clientHeight - previousClientHeight;
                    const contentGrowth = scrollHeight - previousScrollHeight;
                    feedbackSteps = contentGrowth >= clientGrowth - 1 ? feedbackSteps + 1 : 0;
                }
                previousClientHeight = clientHeight;
                previousScrollHeight = scrollHeight;
                contentFloor = Math.max(contentFloor, scrollHeight);
                if (feedbackSteps >= 2) {
                    feedbackFrozenHeight = clampHeight(clientHeight);
                    return feedbackFrozenHeight;
                }
                return clampHeight(Math.max(baseHeight, scrollHeight));
            }
            previousClientHeight = 0;
            previousScrollHeight = 0;
            feedbackSteps = 0;
            return clampHeight(Math.max(baseHeight, contentFloor));
        },
        shouldPublish(size) {
            const height = clampHeight(size.height);
            const width = normalizeWidth(size.width);
            if (Math.abs(height - lastPublishedHeight) <= 1 &&
                Math.abs(width - lastPublishedWidth) <= 1) {
                return false;
            }
            lastPublishedHeight = height;
            lastPublishedWidth = width;
            return true;
        },
    };
}
//# sourceMappingURL=height-controller.js.map