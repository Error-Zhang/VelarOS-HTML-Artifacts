const DEFAULT_ALLOWED_EXTERNAL_URL_PROTOCOLS = ['http:', 'https:'];
function normalizeProtocol(protocol) {
    const normalized = protocol.trim().toLowerCase();
    return normalized.endsWith(':') ? normalized : `${normalized}:`;
}
function resolveAllowedProtocols(protocols) {
    const values = protocols?.length ? protocols : DEFAULT_ALLOWED_EXTERNAL_URL_PROTOCOLS;
    return new Set(values.map(normalizeProtocol).filter(Boolean));
}
export function normalizeHtmlArtifactExternalUrl(value, options = {}) {
    if (typeof value !== 'string')
        return null;
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    const UrlConstructor = globalThis.URL;
    if (!UrlConstructor)
        return null;
    let parsed;
    try {
        parsed = new UrlConstructor(trimmed);
    }
    catch {
        return null;
    }
    return resolveAllowedProtocols(options.allowedProtocols).has(parsed.protocol.toLowerCase())
        ? parsed.href
        : null;
}
//# sourceMappingURL=security.js.map