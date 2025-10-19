
export function createPageUrl(pageName: string) {
    if (!pageName) return '/';
    if (pageName.startsWith('/')) return pageName;
    // Preserve case to match defined routes (e.g., /PharmacyInterface)
    const [base, query] = pageName.split('?');
    const path = '/' + (base || '').trim();
    return query ? `${path}?${query}` : path;
}