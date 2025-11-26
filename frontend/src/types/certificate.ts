// frontend/src/types/certificate.ts

export interface CertificateDto {
  id: number;
  courseId: number;
  courseTitle: string;
  courseIcon?: string;
  issuedAt: string; // ISO string from backend
}

export interface UserCertificatesDto {
  userId: number;
  userName: string;
  certificates: CertificateDto[];
}
