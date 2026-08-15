import { useId, useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

/**
 * Labelled form control with a leading icon, inline validation and, for
 * password inputs, a reveal toggle.
 *
 * The error is only rendered once the field has been touched, so a pristine
 * form does not greet the user with a wall of red. `aria-invalid` and
 * `aria-describedby` are wired up so screen readers get the same signal the
 * colour carries.
 *
 * @param {Object} props
 * @param {string} props.label - Visible label text.
 * @param {string} props.name - Field name, also used as the input id base.
 * @param {string} props.value - Controlled value.
 * @param {(e: React.ChangeEvent) => void} props.onChange - Change handler.
 * @param {() => void} [props.onBlur] - Blur handler, typically marks touched.
 * @param {string} [props.type] - Input type; `password` adds the reveal toggle.
 * @param {React.ComponentType} [props.icon] - Leading icon component.
 * @param {string} [props.error] - Validation message.
 * @param {boolean} [props.touched] - Whether to surface the error.
 * @param {boolean} [props.required] - Marks the field visually as required.
 * @param {React.ReactNode} [props.hint] - Content rendered under the input.
 * @returns {JSX.Element}
 */
const FormField = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  type = 'text',
  icon: Icon,
  error,
  touched,
  required = false,
  hint,
  children,
  ...inputProps
}) => {
  const [revealed, setRevealed] = useState(false);
  const id = useId();
  const fieldId = `${name}-${id}`;
  const errorId = `${fieldId}-error`;

  const isPassword = type === 'password';
  const showError = Boolean(touched && error);
  const resolvedType = isPassword && revealed ? 'text' : type;

  const borderClasses = showError
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/30'
    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/30';

  return (
    <div>
      <label
        htmlFor={fieldId}
        className='block text-xs font-medium text-gray-700 mb-1.5'>
        {label}
        {required && <span className='text-red-500 ml-0.5'>*</span>}
      </label>

      <div className='relative'>
        {Icon && (
          <Icon className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none' />
        )}

        {children || (
          <input
            id={fieldId}
            name={name}
            type={resolvedType}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            aria-invalid={showError}
            aria-describedby={showError ? errorId : undefined}
            className={`block w-full ${Icon ? 'pl-9' : 'pl-3'} ${
              isPassword ? 'pr-10' : 'pr-3'
            } py-2.5 text-sm bg-white border rounded-lg transition-colors focus:outline-none focus:ring-4 disabled:bg-gray-50 disabled:text-gray-400 ${borderClasses}`}
            {...inputProps}
          />
        )}

        {isPassword && (
          <button
            type='button'
            onClick={() => setRevealed((prev) => !prev)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            className='absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors'
            tabIndex={-1}>
            {revealed ? (
              <FiEyeOff className='w-4 h-4' />
            ) : (
              <FiEye className='w-4 h-4' />
            )}
          </button>
        )}
      </div>

      {showError ? (
        <p id={errorId} className='mt-1.5 text-xs text-red-600'>
          {error}
        </p>
      ) : (
        hint
      )}
    </div>
  );
};

export default FormField;
