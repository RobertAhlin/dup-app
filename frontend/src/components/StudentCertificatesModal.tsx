// frontend/src/components/StudentCertificatesModal.tsx

import { useEffect, useState } from 'react';
import { getUserCertificates } from '../api/certificates';
import type { UserCertificatesDto } from '../types/certificate';
import { XMarkIcon, AcademicCapIcon, CalendarIcon } from '@heroicons/react/24/outline';
import * as HeroIcons from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';

type StudentCertificatesModalProps = {
  userId: number;
  onClose: () => void;
};

export default function StudentCertificatesModal({ userId, onClose }: StudentCertificatesModalProps) {
  const [data, setData] = useState<UserCertificatesDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCertificates = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getUserCertificates(userId);
        setData(result);
      } catch (err) {
        console.error('Failed to load student certificates:', err);
        setError('Failed to load certificates');
      } finally {
        setLoading(false);
      }
    };

    loadCertificates();
  }, [userId]);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getIconComponent = (iconName?: string) => {
    if (!iconName) return AcademicCapIcon;
    
    const pascalCase = iconName
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('') + 'Icon';
    
    return (HeroIcons as Record<string, typeof AcademicCapIcon>)[pascalCase] || AcademicCapIcon;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <AcademicCapIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Student Certificates</h2>
              {data && <p className="text-sm text-gray-600">{data.userName}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {loading && (
            <div className="flex justify-center items-center min-h-[200px]">
              <LoadingSpinner size="medium" text="Loading certificates..." />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {!loading && !error && data && data.certificates.length === 0 && (
            <div className="text-center py-12">
              <AcademicCapIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No certificates yet</p>
              <p className="text-gray-400 text-sm mt-2">This student hasn't completed any courses</p>
            </div>
          )}

          {!loading && !error && data && data.certificates.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.certificates.map((cert) => {
                const IconComponent = getIconComponent(cert.courseIcon);
                return (
                  <div
                    key={cert.id}
                    className="bg-white rounded-lg border-2 border-yellow-400 shadow-md hover:shadow-lg transition-shadow p-4"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-blue-100 rounded-full p-2">
                        <IconComponent className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 line-clamp-2">
                          {cert.courseTitle}
                        </h3>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CalendarIcon className="h-4 w-4" />
                        <span>Completed {formatDate(cert.issuedAt)}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-center">
                      <div className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-full">
                        Certificate #{cert.id}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
