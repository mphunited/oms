import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// In Next.js server components and API routes, DATABASE_URL must be set.
// The postgres-js client works reliably with Supabase's Transaction pooler (port 6543).
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false, // required for Supabase Transaction pooler (pgBouncer)
})

export const db = drizzle(client, { schema })
