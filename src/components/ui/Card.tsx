import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export function Card({ 
  title, 
  subtitle,
  children, 
  className = '',
  padding = 'md',
  hover = false
}: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
  
  return (
    <div 
      className={`
        bg-white rounded-xl border border-gray-200 shadow-sm
        ${hover ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}
        ${paddings[padding]}
        ${className}
      `}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-xl font-bold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}