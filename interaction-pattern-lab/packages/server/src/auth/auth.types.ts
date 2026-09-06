import type { Request } from 'express';

export interface AuthenticatedUser { id: string; account: string; displayName: string }
export type AuthenticatedRequest = Request & { currentUser: AuthenticatedUser };
