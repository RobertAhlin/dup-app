import './LoadingSpinner.css';

type Props = {
  size?: 'small' | 'medium' | 'large';
  text?: string;
};

export default function LoadingSpinner({ size = 'medium', text = 'Wait...' }: Props) {
  const barCount = size === 'small' ? 36 : size === 'medium' ? 36 : 36;
  const containerSize = size === 'small' ? 40 : size === 'medium' ? 60 : 80;
  
  return (
    <div className="loading-spinner-container">
      <div className={`loading-spinner loading-spinner-${size}`} style={{ width: containerSize, height: containerSize }}>
        {Array.from({ length: barCount }).map((_, i) => (
          <div
            key={i}
            className="loading-bar"
            style={{ '--i': i, '--count': barCount } as React.CSSProperties}
          />
        ))}
        {text && <span className="loading-text-inside">{text}</span>}
      </div>
    </div>
  );
}
