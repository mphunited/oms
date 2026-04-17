export type MemberRole = 'CSR' | 'ACCOUNTING' | 'WAREHOUSE' | 'ADMIN';

// UserRole is an alias for MemberRole
export type UserRole = MemberRole;

export interface CompanyContext {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface CompanyMember {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: MemberRole;
  createdAt: Date;
}
