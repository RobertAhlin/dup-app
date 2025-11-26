// frontend/src/components/CertificateModal.tsx

import { useNavigate } from 'react-router-dom';
import type { CertificateDto } from '../types/certificate';
import { AcademicCapIcon, XMarkIcon, TrophyIcon } from '@heroicons/react/24/outline';

type CertificateModalProps = {
  certificate: CertificateDto | null;
  userName: string;
  onClose: () => void;
};

export default function CertificateModal({ certificate, userName, onClose }: CertificateModalProps) {
  const navigate = useNavigate();

  if (!certificate) return null;

  const formattedDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative bg-linear-to-br from-yellow-50 via-white to-blue-50 rounded-lg shadow-2xl max-w-2xl w-full p-8 border-4 border-yellow-400">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        {/* Trophy icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-linear-to-br from-yellow-400 to-yellow-600 rounded-full p-4 shadow-lg">
            <TrophyIcon className="h-16 w-16 text-white" />
          </div>
        </div>

        {/* Congratulations text */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Congratulations!</h1>
          <p className="text-xl text-gray-600">You've completed the course</p>
        </div>

        {/* Certificate content */}
        <div className="bg-white rounded-lg p-6 shadow-inner border border-gray-200 mb-6">
          <div className="flex items-center justify-center mb-4">
            <AcademicCapIcon className="h-8 w-8 text-blue-600 mr-2" />
            <h2 className="text-2xl font-semibold text-gray-800">Certificate of Completion</h2>
          </div>
          
          <div className="text-center space-y-3">
            <p className="text-gray-600">This certifies that</p>
            <p className="text-2xl font-bold text-blue-600">{userName}</p>
            <p className="text-gray-600">has successfully completed</p>
            <p className="text-xl font-semibold text-gray-800">{certificate.courseTitle}</p>
            <p className="text-gray-500 text-sm mt-4">Issued on {formattedDate}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              navigate('/my-certificates');
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
          >
            View All Certificates
          </button>
        </div>
      </div>
    </div>
  );
}
