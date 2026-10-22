import React from 'react';
import { ICONS, IconName } from './icons';

export interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  fill?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 18,
  strokeWidth = 1.8,
  fill = 'none',
  className,
  style,
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ verticalAlign: 'middle', display: 'inline-block', flexShrink: 0, ...style }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] || '' }}
    />
  );
};
