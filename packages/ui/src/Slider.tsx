import { type InputHTMLAttributes, forwardRef } from 'react';

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <label className="flex flex-col gap-1">
        {label && <span className="text-xs text-zinc-400">{label}</span>}
        <input
          ref={ref}
          type="range"
          className={`h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-zinc-100 ${className}`}
          {...props}
        />
      </label>
    );
  },
);

Slider.displayName = 'Slider';
