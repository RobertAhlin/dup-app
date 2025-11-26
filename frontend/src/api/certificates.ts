// frontend/src/api/certificates.ts

import axios from './axios';
import type { CertificateDto, UserCertificatesDto } from '../types/certificate';

/**
 * Get all certificates for the current user
 */
export async function getMyCertificates(): Promise<CertificateDto[]> {
  const response = await axios.get<CertificateDto[]>('/api/certificates/my');
  return response.data;
}

/**
 * Get all certificates for a specific user (teacher/admin only)
 */
export async function getUserCertificates(userId: number): Promise<UserCertificatesDto> {
  const response = await axios.get<UserCertificatesDto>(`/api/certificates/users/${userId}`);
  return response.data;
}
