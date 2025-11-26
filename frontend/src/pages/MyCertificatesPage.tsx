// frontend/src/pages/MyCertificatesPage.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getMyCertificates } from '../api/certificates';
import type { CertificateDto } from '../types/certificate';
import MainCard from '../components/MainCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { AcademicCapIcon, CalendarIcon } from '@heroicons/react/24/outline';
import * as HeroIcons from '@heroicons/react/24/outline';

export default function MyCertificatesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<CertificateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (!authLoading && user) {
      loadCertificates();
    }
  }, [authLoading, user, navigate]);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyCertificates();
      setCertificates(data);
    } catch (err) {
      console.error('Failed to load certificates:', err);
      setError('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getIconComponent = (iconName?: string) => {
    if (!iconName) return AcademicCapIcon;
    
    // Convert kebab-case to PascalCase (e.g., 'globe-alt' -> 'GlobeAltIcon')
    const pascalCase = iconName
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('') + 'Icon';
    
    return (HeroIcons as Record<string, typeof AcademicCapIcon>)[pascalCase] || AcademicCapIcon;
  };

  if (authLoading || loading) {
    return (
      <MainCard
        name={user?.name ?? ''}
        email={user?.email ?? ''}
        role={user?.role ?? ''}
        chip={{ label: 'Dashboard', to: '/dashboard' }}
      >
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner size="medium" text="Loading certificates..." />
        </div>
      </MainCard>
    );
  }

  return (
    <MainCard
      name={user?.name ?? ''}
      email={user?.email ?? ''}
      role={user?.role ?? ''}
      chip={{ label: 'Dashboard', to: '/dashboard' }}
    >
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <AcademicCapIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">My Certificates</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {certificates.length === 0 && !error && (
          <div className="text-center py-12">
            <AcademicCapIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No certificates yet</p>
            <p className="text-gray-400 text-sm mt-2">Complete courses to earn certificates</p>
          </div>
        )}

        {certificates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => {
              const IconComponent = getIconComponent(cert.courseIcon);
              return (
                <div
                  key={cert.id}
                  className="bg-white rounded-lg border-2 border-yellow-400 shadow-lg hover:shadow-xl transition-shadow p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-100 rounded-full p-3">
                      <IconComponent className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 text-lg line-clamp-2">
                        {cert.courseTitle}
                      </h3>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Completed on {formatDate(cert.issuedAt)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-center">
                    <div className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">
                      Certificate #{cert.id}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainCard>
  );
}
