export function hasUnseenBetaCenterContent(
    lastSeenVersion: string | null,
    currentVersion: string
): boolean {
    return lastSeenVersion !== currentVersion;
}
