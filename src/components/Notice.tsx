export function Notice({ error, success }: { error: string; success: string }) {
  if (!error && !success) return null
  return (
    <div className={`notice ${error ? 'notice-error' : 'notice-success'}`} role={error ? 'alert' : 'status'}>
      {error || success}
    </div>
  )
}
