import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useElection } from '../context/ElectionContext';
import api from '../api/apiClient';
import { Spinner } from '../components/ui/Loaders';
import { toast } from 'react-toastify';
import {
  FiBarChart2,
  FiAward,
  FiUsers,
  FiCalendar,
  FiPrinter,
  FiDownload,
} from 'react-icons/fi';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDate } from '../utils/election';

const Results = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { getElectionById, loading: electionsLoading } = useElection();
  const [isLoading, setIsLoading] = useState(true);
  const [election, setElection] = useState(null);
  const [results, setResults] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);

  // jsPDF and its autotable plugin are the bulk of this page's weight, and
  // most viewers only read the results on screen. Pulling them in when the
  // download is actually requested keeps them out of the initial load.
  const generateReport = async () => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    // Create a new PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add title
    doc.setFontSize(20);
    doc.setTextColor(30, 58, 138); // Dark blue
    doc.text(election.title, pageWidth / 2, 20, { align: 'center' });

    // Add subtitle
    doc.setFontSize(14);
    doc.setTextColor(75, 85, 99); // Gray 600
    doc.text('Election Results Report', pageWidth / 2, 30, { align: 'center' });

    // Add election details
    const rawEligibleFromBackend = Number(
      election?.eligibleVotersCount ?? election?.totalVoters ?? 0
    );
    const safeTotalVotes = Number(election?.voted ?? totalVotes ?? 0);

    // If backend doesn't provide a valid eligible count but there are votes,
    // fall back to treating all votes as from the eligible pool to avoid `of 0`.
    const safeTotalEligibleVoters =
      rawEligibleFromBackend > 0
        ? rawEligibleFromBackend
        : safeTotalVotes > 0
          ? safeTotalVotes
          : 0;

    const safeTurnout =
      safeTotalEligibleVoters > 0
        ? (safeTotalVotes / safeTotalEligibleVoters) * 100
        : 0;

    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(
      `Election ID: ${election.id || election._id || electionId}`,
      15,
      45
    );
    doc.text(
      `Total Eligible Voters: ${safeTotalEligibleVoters.toLocaleString()}`,
      15,
      50
    );
    doc.text(`Votes Cast: ${safeTotalVotes.toLocaleString()}`, 15, 55);
    doc.text(`Turnout: ${safeTurnout.toFixed(1)}%`, 15, 60);

    // Add date and time
    const now = new Date();
    doc.text(
      `Report generated on: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`,
      pageWidth - 15,
      45,
      { align: 'right' }
    );

    // Add a line
    doc.setDrawColor(209, 213, 219); // Gray 300
    doc.setLineWidth(0.5);
    doc.line(15, 65, pageWidth - 15, 65);

    // Add results table
    const tableColumn = ['#', 'Candidate', 'Party', 'Votes', 'Percentage'];
    const tableRows = results.map((candidate, index) => [
      index + 1,
      candidate.name,
      candidate.party || 'Independent',
      candidate.votes.toLocaleString(),
      `${candidate.percentage.toFixed(1)}%`,
    ]);

    // Add table to document
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 75,
      margin: { left: 15, right: 15 },
      headStyles: {
        fillColor: [30, 58, 138], // Dark blue
        textColor: 255, // White
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251], // Gray 50
      },
      didDrawPage: function (data) {
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128); // Gray 500
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      },
    });

    // Add winner section
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setTextColor(22, 163, 74); // Green 600
    doc.text(
      isTie ? 'Election Results in a Tie' : 'Election Winner',
      15,
      finalY
    );

    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99);
    if (isTie) {
      const tiedCandidates = results.filter(
        (r) => r.votes === leadingCandidate.votes
      );
      doc.text(
        `The following candidates are tied with ${leadingCandidate.votes} votes each:`,
        15,
        finalY + 10
      );

      tiedCandidates.forEach((candidate, index) => {
        doc.text(
          `${index + 1}. ${candidate.name} (${candidate.party || 'Independent'})`,
          20,
          finalY + 20 + index * 5
        );
      });
    } else {
      doc.text(
        `The winner is ${leadingCandidate.name} with ${leadingCandidate.percentage.toFixed(1)}% of the votes.`,
        15,
        finalY + 10
      );
    }

    // Save the PDF
    doc.save(`election-results-${election.id}.pdf`);
  };

  // Every bar on this chart measures the same thing — votes for a candidate —
  // so eight unrelated hues (blue, green, yellow, purple…) implied a
  // distinction that does not exist and made the leader no easier to spot.
  // One hue, stepped down by rank, encodes the only thing that matters here:
  // who is ahead. Candidates past the ramp share the lightest step.
  const chartColors = [
    'bg-primary-600',
    'bg-primary-500',
    'bg-primary-400',
    'bg-primary-300',
    'bg-primary-200',
  ];

  useEffect(() => {
    const loadElection = async () => {
      try {
        // If elections are still loading in context, wait before resolving
        if (electionsLoading) {
          setIsLoading(true);
          return;
        }

        setIsLoading(true);

        // First try to get the election from context
        const contextElection = getElectionById(electionId);
        let foundElection = contextElection;

        // If not present in context (e.g. direct refresh) OR missing
        // backend-enriched fields like eligibleVotersCount, fetch from backend
        if (!foundElection || foundElection.eligibleVotersCount == null) {
          const response = await api.get(`/elections/${electionId}`);
          const remoteElection =
            response?.data?.data ||
            response?.data?.election ||
            response?.data ||
            response;

          if (!remoteElection) {
            toast.error('Election not found');
            navigate('/');
            return;
          }

          // Merge context election (which may contain client-updated results)
          // with the backend-enriched election (which has eligibleVotersCount,
          // voted, etc.). Prefer backend meta fields but keep non-empty
          // results from context if backend results are missing/empty.
          const backendResults = remoteElection?.results;
          const contextResults = contextElection?.results;

          // Helper to sum votes from a plain results map
          const getTotalFromResults = (resultsMap) => {
            if (!resultsMap || typeof resultsMap !== 'object') return 0;
            return Object.values(resultsMap).reduce(
              (sum, val) => sum + Number(val || 0),
              0
            );
          };

          const backendTotal = getTotalFromResults(backendResults);
          const contextTotal = getTotalFromResults(contextResults);

          // Prefer the source with higher total votes. This avoids replacing
          // non-zero client-side results with zero-valued backend results.
          let mergedResults = backendResults;
          if (contextTotal > backendTotal) {
            mergedResults = contextResults;
          }

          foundElection = {
            ...(contextElection || {}),
            ...(remoteElection || {}),
            ...(mergedResults ? { results: mergedResults } : {}),
          };
        }

        setElection(foundElection);

        // Process results from election.results map
        const resultsData = (foundElection.candidates || []).map(
          (candidate) => {
            const key = candidate._id || candidate.id;
            const votes = key ? foundElection.results?.[key] || 0 : 0;
            return {
              ...candidate,
              votes,
            };
          }
        );

        const total = resultsData.reduce((sum, c) => sum + c.votes, 0);

        const processedResults = resultsData
          .map((c) => ({
            ...c,
            percentage: total > 0 ? (c.votes / total) * 100 : 0,
          }))
          .sort((a, b) => b.votes - a.votes);

        setResults(processedResults);
        setTotalVotes(total);
      } catch (error) {
        console.error('Error loading election:', error);
        toast.error('Failed to load election data');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    loadElection();
  }, [electionId, navigate, getElectionById, electionsLoading]);
  // While resolving the election (including on refresh), keep showing loader.
  // True not-found cases are handled in loadElection via toast + navigate('/').
  if (isLoading || !election) {
    return (
      <div className='bg-gray-50 flex items-center justify-center'>
        <Spinner />
      </div>
    );
  }

  // Calculate statistics with safe fallbacks using backend-provided counts
  const rawEligibleFromBackend = Number(
    election?.eligibleVotersCount ?? election?.totalVoters ?? 0
  );

  const votesCount = Number(election?.voted ?? totalVotes ?? 0);

  // If backend doesn't provide a valid eligible count but there are votes,
  // fall back to treating all votes as from the eligible pool to avoid `of 0`.
  const totalEligibleVoters =
    rawEligibleFromBackend > 0
      ? rawEligibleFromBackend
      : votesCount > 0
        ? votesCount
        : 0;

  const turnout =
    totalEligibleVoters > 0 ? (votesCount / totalEligibleVoters) * 100 : 0;
  const leadingCandidate = results[0];
  const isTie = results.length > 1 && results[0].votes === results[1].votes;
  const tiedCandidates = results.filter(
    (candidate) => candidate.votes === leadingCandidate?.votes
  );

  const isFinal = String(election.status || '').toLowerCase() === 'completed';

  return (
    <div className='py-8 max-w-5xl mx-auto'>
      <PageHeader
        title={election.title}
        description={election.description}
        back={{ to: '/elections', label: 'Back to elections' }}
        meta={
          <div className='flex flex-wrap items-center gap-3'>
            <StatusBadge status={election.status} />
            <span className='inline-flex items-center gap-1.5 text-xs text-gray-500'>
              <FiCalendar className='w-3.5 h-3.5' aria-hidden='true' />
              {formatDate(election.startDate)} – {formatDate(election.endDate)}
            </span>
          </div>
        }
        actions={
          <>
            <Button
              variant='secondary'
              size='sm'
              icon={FiPrinter}
              onClick={() => window.print()}>
              Print
            </Button>
            <Button size='sm' icon={FiDownload} onClick={generateReport}>
              Report
            </Button>
          </>
        }
      />

      {/* Turnout was previously stated three times over — a header chip, a
          sidebar figure and a progress bar. It is reported once, here. */}
      <div className='grid gap-4 sm:grid-cols-3 mb-6'>
        <StatCard
          label='Votes cast'
          value={votesCount.toLocaleString()}
          caption={`across ${results.length} candidates`}
          icon={FiBarChart2}
        />
        <StatCard
          label='Turnout'
          value={`${turnout.toFixed(1)}%`}
          caption={`of ${totalEligibleVoters.toLocaleString()} eligible voters`}
          icon={FiUsers}
          tone='success'
        />
        <StatCard
          label={isFinal ? 'Winner' : 'Currently leading'}
          value={
            <span className='text-xl leading-tight block truncate'>
              {isTie ? 'Tied' : leadingCandidate?.name || '—'}
            </span>
          }
          caption={
            isTie
              ? `${tiedCandidates.length} candidates level on ${leadingCandidate?.votes ?? 0} votes`
              : leadingCandidate
                ? `${leadingCandidate.votes.toLocaleString()} votes · ${leadingCandidate.percentage.toFixed(1)}%`
                : 'No votes yet'
          }
          icon={FiAward}
          tone='warning'
        />
      </div>

      {/* One ranked list replaces the previous pair of blocks, which showed the
          same numbers twice — once as bars, once as a table. */}
      <Card padded={false}>
        <div className='px-5 pt-5'>
          <CardHeader
            title={isFinal ? 'Final result' : 'Live standing'}
            description={
              votesCount === 0
                ? 'No votes have been cast yet.'
                : 'Ranked by votes received. Bars are shown relative to the total cast.'
            }
          />
        </div>

        <ol className='divide-y divide-gray-100'>
          {results.map((candidate, index) => {
            const isLeader = index === 0 && candidate.votes > 0;

            return (
              <li
                key={candidate._id || candidate.id || index}
                className='px-5 py-4'>
                <div className='flex items-center gap-3 mb-2'>
                  <span
                    className='flex-shrink-0 h-7 w-7 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center tabular-nums'
                    aria-hidden='true'>
                    {index + 1}
                  </span>

                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <span className='text-sm font-semibold text-gray-900 truncate'>
                        {candidate.name}
                      </span>
                      {isLeader && (
                        <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-success-50 text-success-700 ring-1 ring-success-200'>
                          <FiAward className='h-3 w-3' aria-hidden='true' />
                          {isTie ? 'Tied' : isFinal ? 'Winner' : 'Leading'}
                        </span>
                      )}
                    </div>
                    <span className='block text-xs text-gray-500 truncate'>
                      {candidate.party || 'Independent'}
                    </span>
                  </div>

                  <div className='text-right flex-shrink-0'>
                    <span className='block text-sm font-semibold text-gray-900 tabular-nums'>
                      {candidate.percentage.toFixed(1)}%
                    </span>
                    <span className='block text-xs text-gray-500 tabular-nums'>
                      {candidate.votes.toLocaleString()}{' '}
                      {candidate.votes === 1 ? 'vote' : 'votes'}
                    </span>
                  </div>
                </div>

                <div
                  className='w-full bg-gray-100 rounded-full h-2 overflow-hidden'
                  role='img'
                  aria-label={`${candidate.name}: ${candidate.percentage.toFixed(1)} percent`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      chartColors[Math.min(index, chartColors.length - 1)]
                    }`}
                    style={{ width: `${Math.max(candidate.percentage, 0)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <p className='mt-6 text-center text-xs text-gray-400'>
        {isFinal ? 'Final results' : 'Live results'} · updated{' '}
        {new Date().toLocaleTimeString()}
      </p>
    </div>
  );
};

export default Results;
