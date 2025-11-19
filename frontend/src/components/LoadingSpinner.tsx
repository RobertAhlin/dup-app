import './LoadingSpinner.css';

type Props = {
  size?: 'small' | 'medium' | 'large';
  text?: string;
};

export default function LoadingSpinner({ size = 'medium', text = 'Loading...' }: Props) {
  const barCount = size === 'small' ? 12 : size === 'medium' ? 24 : 36;
  const containerSize = size === 'small' ? 40 : size === 'medium' ? 60 : 100;
  
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
      </div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
}
