import React from 'react';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (val: number) => string | number;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ 
  value, 
  duration = 1000,
  format = Math.round
}) => {
  const animatedValue = useAnimatedNumber(value, duration);
  return <span>{format(animatedValue)}</span>;
};
