import { statusMeta } from '../../utils/election';

/**
 * Election status pill.
 *
 * Reads its colour and wording from the shared status table, so "active"
 * looks and reads the same on the elections list, the ballot and the admin
 * console. The dot gives a non-colour cue for the same signal.
 *
 * @param {Object} props
 * @param {string} props.status - Raw election status.
 * @param {boolean} [props.short] - Use the compact label.
 * @returns {JSX.Element}
 */
const StatusBadge = ({ status, short = false, className = '' }) => {
  const meta = statusMeta(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.pill} ${className}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}
        aria-hidden='true'
      />
      {short ? meta.short : meta.label}
    </span>
  );
};

export default StatusBadge;
