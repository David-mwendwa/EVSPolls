// src/context/ElectionContext.jsx
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react';
import api from '../api/apiClient';

const ElectionContext = createContext();

const initialState = {
  elections: [],
  currentElection: null,
  loading: true,
  error: null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_ELECTIONS_REQUEST':
      return { ...state, loading: true, error: null };

    case 'FETCH_ELECTIONS_SUCCESS':
      return { ...state, loading: false, elections: action.payload };

    case 'FETCH_ELECTIONS_FAILURE':
      return { ...state, loading: false, error: action.payload };

    case 'SET_CURRENT_ELECTION':
      return { ...state, currentElection: action.payload };

    case 'CREATE_ELECTION':
      return {
        ...state,
        elections: [...state.elections, action.payload],
        currentElection: action.payload,
      };

    case 'UPDATE_ELECTION':
      return {
        ...state,
        elections: state.elections.map((election) =>
          election._id === action.payload._id ? action.payload : election
        ),
        currentElection:
          state.currentElection?._id === action.payload._id
            ? action.payload
            : state.currentElection,
      };

    case 'DELETE_ELECTION':
      return {
        ...state,
        elections: state.elections.filter(
          (election) => election._id !== action.payload
        ),
        currentElection:
          state.currentElection?._id === action.payload
            ? null
            : state.currentElection,
      };

    case 'SUBMIT_VOTE': {
      const { electionId, results, updatedElection } = action.payload;

      const updateOne = (election) => {
        const sameId =
          String(election._id) === String(electionId) ||
          (election.id && String(election.id) === String(electionId));
        if (!sameId) return election;

        // The vote response is already the authoritative post-vote election,
        // including the refreshed turnout count and the flag marking this
        // voter as having cast a ballot.
        const base = updatedElection || election;

        return {
          ...base,
          results: results ?? base.results,
          hasVotedForCurrentUser: true,
        };
      };

      return {
        ...state,
        elections: state.elections.map(updateOne),
        currentElection: state.currentElection
          ? updateOne(state.currentElection)
          : state.currentElection,
      };
    }

    case 'DELETE_ALL_ELECTIONS': {
      return {
        ...state,
        elections: [],
        currentElection: null,
      };
    }

    default:
      return state;
  }
};

export const ElectionProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Fetch all elections
  const fetchElections = useCallback(async () => {
    dispatch({ type: 'FETCH_ELECTIONS_REQUEST' });
    try {
      const response = await api.get('/elections');

      // Support different backend response shapes and always store an array
      const raw =
        response?.data?.data ||
        response?.data?.elections ||
        response?.data ||
        response;

      const electionsArray = Array.isArray(raw) ? raw : [];

      dispatch({ type: 'FETCH_ELECTIONS_SUCCESS', payload: electionsArray });
    } catch (error) {
      dispatch({ type: 'FETCH_ELECTIONS_FAILURE', payload: error.message });
      console.error('Failed to fetch elections:', error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  // Get election by ID
  const getElectionById = useCallback(
    (id) => {
      return state.elections.find(
        (election) =>
          String(election._id) === String(id) ||
          (election.id && String(election.id) === String(id))
      );
    },
    [state.elections]
  );

  // Set current election
  const setCurrentElection = useCallback((election) => {
    dispatch({ type: 'SET_CURRENT_ELECTION', payload: election });
  }, []);

  // Create election
  const createElection = async (electionData) => {
    try {
      const response = await api.post('/elections', electionData);
      const created =
        response?.data?.data ||
        response?.data?.election ||
        response?.data ||
        response;

      dispatch({ type: 'CREATE_ELECTION', payload: created });
      return created;
    } catch (error) {
      console.error('Failed to create election:', error);
      throw error;
    }
  };

  // Update election status (e.g., cancel)
  const updateElectionStatus = async (id, status) => {
    try {
      const response = await api.patch(`/elections/${id}/status`, { status });
      const updated =
        response?.data?.data ||
        response?.data?.election ||
        response?.data ||
        response;

      dispatch({ type: 'UPDATE_ELECTION', payload: updated });
      return updated;
    } catch (error) {
      console.error('Failed to update election status:', error);
      throw error;
    }
  };

  // Update election
  const updateElection = async (electionData) => {
    try {
      const response = await api.patch(
        `/elections/${electionData._id}`,
        electionData
      );
      const updated =
        response?.data?.data ||
        response?.data?.election ||
        response?.data ||
        response;

      dispatch({ type: 'UPDATE_ELECTION', payload: updated });
      return updated;
    } catch (error) {
      console.error('Failed to update election:', error);
      throw error;
    }
  };

  // Delete election
  const deleteElection = async (id) => {
    try {
      await api.delete(`/elections/${id}`);
      dispatch({ type: 'DELETE_ELECTION', payload: id });
    } catch (error) {
      console.error('Failed to delete election:', error);
      throw error;
    }
  };

  const deleteAllElections = async () => {
    try {
      await api.delete('/elections/purge/all');
      dispatch({ type: 'DELETE_ALL_ELECTIONS' });
    } catch (error) {
      console.error('Failed to delete all elections:', error);
      throw error;
    }
  };

  // Submit vote
  const submitVote = async (electionId, candidateId, voterId) => {
    try {
      const response = await api.post(`/elections/${electionId}/vote`, {
        candidateId,
      });

      const updatedElection =
        response?.data?.data ||
        response?.data?.election ||
        response?.data ||
        response;

      dispatch({
        type: 'SUBMIT_VOTE',
        payload: {
          electionId,
          results: updatedElection.results,
          updatedElection,
        },
      });
      return updatedElection;
    } catch (error) {
      console.error('Failed to submit vote:', error);
      throw error;
    }
  };

  return (
    <ElectionContext.Provider
      value={{
        elections: state.elections,
        currentElection: state.currentElection,
        loading: state.loading,
        error: state.error,
        fetchElections,
        createElection,
        updateElection,
        updateElectionStatus,
        deleteElection,
        deleteAllElections,
        submitVote,
        getElectionById,
        setCurrentElection,
      }}>
      {children}
    </ElectionContext.Provider>
  );
};

export const useElection = () => {
  const context = useContext(ElectionContext);
  if (!context) {
    throw new Error('useElection must be used within an ElectionProvider');
  }
  return context;
};
