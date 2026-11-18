import type { AuthenticatedUser, UserRecord } from '../../common/types/domain.types.js';

export function toAuthenticatedUser(record: UserRecord): AuthenticatedUser {
  return {
    id: record.id,
    email: record.email,
    fullName: record.fullName,
    role: record.role,
    planTier: record.planTier,
    vipExpiresAt: record.vipExpiresAt ? record.vipExpiresAt.toISOString() : null,
    avatarUrl: record.avatarUrl,
  };
}
