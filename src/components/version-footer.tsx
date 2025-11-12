export function VersionFooter() {
  const commitMessage = process.env.NEXT_PUBLIC_GIT_COMMIT_MESSAGE || 'Unknown version'
  const commitSha = process.env.NEXT_PUBLIC_GIT_COMMIT_SHA?.slice(0, 7) || ''
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || ''

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t border-border/50 py-2 px-4 z-50">
      <div className="container mx-auto">
        <p className="text-xs text-muted-foreground text-center">
          {commitMessage}
          {commitSha && <span className="ml-2 font-mono">({commitSha})</span>}
          {buildTime && <span className="ml-2">• Built: {new Date(buildTime).toLocaleString()}</span>}
        </p>
      </div>
    </footer>
  )
}
