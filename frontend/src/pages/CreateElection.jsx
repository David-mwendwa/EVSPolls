import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useElection } from '../context/ElectionContext';
import { toast } from 'react-toastify';

// Function to generate a URL-friendly slug from a string
const slugify = (str) => {
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
};
import {
  FiPlus,
  FiX,
  FiArrowLeft,
  FiSave,
  FiChevronDown,
} from 'react-icons/fi';
import usePageMeta from '../lib/pageMeta';

// List of general political parties and affiliations
const POLITICAL_PARTIES = [
  'Progressive Party',
  'Unity Alliance',
  'Democratic Front',
  "People's Choice",
  'New Vision',
  'Future Forward',
  'Community First',
  'Reform Party',
  'Green Party',
  'Liberal Democrats',
  'Conservative Union',
  'Social Democrats',
  'Labor Party',
  'Independent',
  'Coalition for Change',
  'Rising Stars',
  'Next Generation',
  'United Front',
  'Progressive Alliance',
  'Common Ground',
  'Other (Please specify)',
];

const CreateElection = ({ onCancel }) => {
  usePageMeta('Create an election', 'Set up a new election.', { noindex: true });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
  });
  const [candidates, setCandidates] = useState([
    { id: Date.now(), name: '', party: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Set default dates
  useEffect(() => {
    const now = new Date();
    const startDate = now.toISOString().slice(0, 16);
    const endDate = new Date(now.setDate(now.getDate() + 1))
      .toISOString()
      .slice(0, 16);

    setFormData((prev) => ({
      ...prev,
      startDate: startDate,
      endDate: endDate,
    }));
  }, []);

  const { createElection } = useElection();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleAddCandidate = () => {
    if (candidates.length >= 10) {
      toast.warning('Maximum of 10 candidates allowed');
      return;
    }
    setCandidates([
      ...candidates,
      {
        id: Date.now() + Math.random(),
        name: '',
        party: '',
        customParty: '',
      },
    ]);
  };

  const handleRemoveCandidate = (id) => {
    if (candidates.length > 1) {
      setCandidates(candidates.filter((candidate) => candidate.id !== id));
    }
  };

  const handleCandidateChange = (id, field, value) => {
    setCandidates(
      candidates.map((candidate) =>
        candidate.id === id ? { ...candidate, [field]: value } : candidate
      )
    );

    // Clear candidate errors when user types
    if (errors.candidates) {
      setErrors((prev) => ({
        ...prev,
        candidates: undefined,
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Election title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Please provide a description';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    const validCandidates = candidates.filter(
      (c) => c.name.trim() && c.party.trim()
    );

    if (validCandidates.length < 2) {
      newErrors.candidates =
        'Please add at least 2 candidates with names and parties';
    }

    // Check for duplicate candidate names
    const candidateNames = validCandidates.map((c) =>
      c.name.trim().toLowerCase()
    );
    if (new Set(candidateNames).size !== candidateNames.length) {
      newErrors.candidates = 'Candidate names must be unique';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const validCandidates = candidates
        .filter(
          (c) => c.name.trim() && (c.party.trim() || c.customParty?.trim())
        )
        .map((candidate, index) => {
          // Use custom party if 'Other' was selected and a custom party was specified
          const party =
            candidate.party === 'Other (Please specify)' &&
            candidate.customParty?.trim()
              ? candidate.customParty.trim()
              : candidate.party;

          // Only send fields the backend needs; let Mongo generate _id and any extra fields
          return {
            name: candidate.name.trim(),
            party: party.trim(),
          };
        });

      // Format dates to ISO string and ensure they include timezone information
      const startDate = new Date(formData.startDate).toISOString();
      const endDate = new Date(formData.endDate).toISOString();

      // Send only core fields; backend will handle id, status, timestamps, etc.
      const electionData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        startDate,
        endDate,
        candidates: validCandidates,
      };

      const created = await createElection(electionData);

      const successMessage =
        created?.message || 'Election created successfully!';

      toast.success(successMessage, {
        position: 'top-center',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
      if (onCancel) {
        onCancel();
      } else {
        navigate('/admin?tab=elections');
      }
    } catch (error) {
      console.error('Error creating election:', error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to create election. Please try again.';

      toast.error(errorMessage, {
        position: 'top-center',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8'>
        {/* Main form container */}
        <div className='bg-white shadow-sm rounded-xl overflow-hidden'>
          <form onSubmit={handleSubmit} className='divide-y divide-gray-200'>
            {/* Election Details Section */}
            <div className='p-4 sm:p-6'>
              <h2 className='text-lg font-medium text-gray-900 mb-4'>
                Election Details
              </h2>

              <div className='space-y-4'>
                {/* Title */}
                <div>
                  <label
                    htmlFor='title'
                    className='block text-sm font-medium text-gray-700 mb-1'>
                    Election Title <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    id='title'
                    name='title'
                    value={formData.title}
                    onChange={handleInputChange}
                    className={`block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm sm:text-base ${
                      errors.title ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder='E.g., Class President 2023'
                  />
                  {errors.title && (
                    <p className='mt-1 text-sm text-red-600'>{errors.title}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor='description'
                    className='block text-sm font-medium text-gray-700 mb-1'>
                    Description <span className='text-red-500'>*</span>
                  </label>
                  <textarea
                    id='description'
                    name='description'
                    rows={3}
                    value={formData.description}
                    onChange={handleInputChange}
                    className={`block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm sm:text-base ${
                      errors.description ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder='Provide a brief description of this election'
                  />
                  {errors.description && (
                    <p className='mt-1 text-sm text-red-600'>
                      {errors.description}
                    </p>
                  )}
                </div>

                {/* Date Range */}
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div>
                    <label
                      htmlFor='startDate'
                      className='block text-sm font-medium text-gray-700 mb-1'>
                      Start Date & Time <span className='text-red-500'>*</span>
                    </label>
                    <input
                      type='datetime-local'
                      id='startDate'
                      name='startDate'
                      value={formData.startDate}
                      onChange={handleInputChange}
                      min={new Date().toISOString().slice(0, 16)}
                      className={`block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm sm:text-base ${
                        errors.startDate ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.startDate && (
                      <p className='mt-1 text-sm text-red-600'>
                        {errors.startDate}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor='endDate'
                      className='block text-sm font-medium text-gray-700 mb-1'>
                      End Date & Time <span className='text-red-500'>*</span>
                    </label>
                    <input
                      type='datetime-local'
                      id='endDate'
                      name='endDate'
                      value={formData.endDate}
                      onChange={handleInputChange}
                      min={
                        formData.startDate ||
                        new Date().toISOString().slice(0, 16)
                      }
                      className={`block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm sm:text-base ${
                        errors.endDate ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.endDate && (
                      <p className='mt-1 text-sm text-red-600'>
                        {errors.endDate}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Candidates Section */}
            <div className='p-4 sm:p-6'>
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4'>
                <h2 className='text-lg font-medium text-gray-900 mb-3 sm:mb-0'>
                  Candidates
                </h2>
                <button
                  type='button'
                  onClick={handleAddCandidate}
                  className='inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed'
                  disabled={candidates.length >= 10}>
                  <FiPlus className='mr-1.5 h-4 w-4' />
                  <span>Add Candidate</span>
                </button>
              </div>

              {errors.candidates && (
                <p className='text-sm text-red-600 mb-4'>{errors.candidates}</p>
              )}

              <div className='space-y-3'>
                {candidates.map((candidate, index) => (
                  <div key={candidate.id} className='space-y-2'>
                    <div className='flex items-center space-x-2'>
                      <div className='flex-1'>
                        <label
                          htmlFor={`candidate-name-${index}`}
                          className='sr-only'>
                          Candidate {index + 1} Name
                        </label>
                        <input
                          type='text'
                          id={`candidate-name-${index}`}
                          value={candidate.name}
                          onChange={(e) =>
                            handleCandidateChange(
                              candidate.id,
                              'name',
                              e.target.value
                            )
                          }
                          className='block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm sm:text-base'
                          placeholder={`Candidate ${index + 1} name`}
                        />
                      </div>
                      {candidates.length > 1 && (
                        <button
                          type='button'
                          onClick={() => handleRemoveCandidate(candidate.id)}
                          className='flex-shrink-0 p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'>
                          <FiX className='h-4 w-4' />
                          <span className='sr-only'>Remove candidate</span>
                        </button>
                      )}
                    </div>
                    <div className='flex items-center space-x-2'>
                      <div className='flex-1 relative'>
                        <label
                          htmlFor={`candidate-party-${index}`}
                          className='block text-xs font-medium text-gray-700 mb-1'>
                          Party/Affiliation
                        </label>
                        <div className='relative'>
                          <select
                            id={`candidate-party-${index}`}
                            value={candidate.party}
                            onChange={(e) =>
                              handleCandidateChange(
                                candidate.id,
                                'party',
                                e.target.value
                              )
                            }
                            className='block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm sm:text-base pr-8 appearance-none bg-white cursor-pointer'>
                            <option value=''>Select a party</option>
                            {POLITICAL_PARTIES.map((party) => (
                              <option key={party} value={party}>
                                {party}
                              </option>
                            ))}
                          </select>
                          <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700'>
                            <FiChevronDown className='h-4 w-4' />
                          </div>
                        </div>
                        {candidate.party === 'Other (Please specify)' && (
                          <div className='mt-2'>
                            <input
                              type='text'
                              value={candidate.customParty || ''}
                              onChange={(e) =>
                                handleCandidateChange(
                                  candidate.id,
                                  'customParty',
                                  e.target.value
                                )
                              }
                              className='block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm sm:text-base mt-1'
                              placeholder='Enter party name'
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form actions */}
            <div className='px-4 py-4 sm:px-6 bg-gray-50'>
              <div className='flex flex-col-reverse sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3'>
                <button
                  type='button'
                  onClick={onCancel}
                  className='inline-flex justify-center items-center px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'>
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={isSubmitting}
                  className='inline-flex justify-center items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed'>
                  {isSubmitting ? (
                    <>
                      <svg
                        className='animate-spin -ml-1 mr-2 h-4 w-4 text-white'
                        xmlns='http://www.w3.org/2000/svg'
                        fill='none'
                        viewBox='0 0 24 24'>
                        <circle
                          className='opacity-25'
                          cx='12'
                          cy='12'
                          r='10'
                          stroke='currentColor'
                          strokeWidth='4'></circle>
                        <path
                          className='opacity-75'
                          fill='currentColor'
                          d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <FiSave className='mr-2 h-4 w-4' />
                      Create Election
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateElection;
