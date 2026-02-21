import React from 'react';

export interface ToggleProps {
  /** Whether the toggle is on. */
  checked: boolean;
  /** Called when the user toggles. */
  onChange: (checked: boolean) => void;
  /** Optional label text. */
  label?: string;
  /** Disable interaction. */
  disabled?: boolean;
  className?: string;
}

const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
}) => {
  const id = label ? `toggle-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined;

  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-3 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`.trim()}
    >
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${checked ? 'bg-primary-500' : 'bg-gray-300'}`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
        />
      </button>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
};

export default Toggle;
