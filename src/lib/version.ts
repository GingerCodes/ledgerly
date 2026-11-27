/** "v2026.11.27-17 · a1b2c3d" for a release build, "dev" when built locally without release info. */
export function formatVersion(releaseTag: string | undefined, commitSha: string | undefined): string {
  const parts = [releaseTag?.trim(), commitSha?.trim().slice(0, 7)].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'dev'
}

// Injected at build time by the deploy workflow (see .github/workflows/deploy-vercel.yml).
export const appVersion = formatVersion(import.meta.env.VITE_RELEASE_TAG, import.meta.env.VITE_COMMIT_SHA)
