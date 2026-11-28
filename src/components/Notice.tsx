export function Notice({ error, success }: { error: string; success: string }) {
  if (!error && !success) return null
  return (
    <div className={`notice ${error ? 'notice-error' : 'notice-success'}`} role={error ? 'alert' : 'status'}>
      {!error && (
        <svg className="check-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="8" fill="currentColor" opacity=".16" />
          <path d="M4.5 8.4l2.4 2.4 4.6-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {error || success}
    </div>
  )
}
