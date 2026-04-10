import type { Company, UserRole } from "@prisma/client";

export type { Company, UserRole };

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
  role: UserRole;
  createdAt: Date;
}
