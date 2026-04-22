export async function getUserSignature(): Promise<string> {
  const res = await fetch('/api/me')
  if (!res.ok) return ''
  const user = await res.json()
  return user.email_signature ?? ''
}
