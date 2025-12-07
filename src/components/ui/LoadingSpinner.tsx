interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };
  
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className={`${sizes[size]} border-4 border-gray-200 border-t-sb-primary rounded-full animate-spin`} />
      {text && <p className="mt-4 text-gray-600">{text}</p>}
    </div>
  );
}