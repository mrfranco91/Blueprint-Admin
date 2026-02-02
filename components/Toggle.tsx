import React from 'react';

interface ToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const Toggle: React.FC<ToggleProps> = ({ 
  checked, 
  onCheckedChange, 
  className = '', 
  ...props 
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? 'on' : 'off'}
      onClick={(e) => {
        onCheckedChange(!checked);
        props.onClick?.(e);
      }}
      className={`toggle ${className}`}
      {...props}
    />
  );
};
