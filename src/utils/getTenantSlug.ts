export function getTenantSlug() {
    const host = window.location.hostname;
    const parts = host.split(".");

    return parts.length >= 3 ? parts[0] : "bezerros";
}
