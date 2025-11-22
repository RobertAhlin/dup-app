import LoadingSpinner from '../components/LoadingSpinner';

export default function DummyPage() {
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <LoadingSpinner size="medium"/>
    </div>
  );
}
