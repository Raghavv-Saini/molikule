import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Navbar } from '../components/Navbar';
import { SearchForm } from '../components/SearchForm';
import { SummaryCard } from '../components/SummaryCard';
import { VendorComparisonChart } from '../components/VendorComparisonChart';
import { ResultsTable } from '../components/ResultsTable';
import * as searchService from '../services/search';
import type { SearchRequest, SearchResponse } from '../types';

type SortColumn = 'purchase_date' | 'cost' | 'net_price';
type SortOrder = 'asc' | 'desc';

// Default pagination values for a fresh search
const DEFAULT_PAGE_SIZE = 50;

function DashboardContent() {
  const [searchRequest, setSearchRequest] = useState<SearchRequest | null>(null);

  const mutation = useMutation<SearchResponse, Error, SearchRequest>({
    mutationFn: (req) => searchService.search(req),
  });

  // Extract the error message from either an Axios error response or a plain Error
  function getErrorMessage(err: Error): string {
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      return err.response.data.message as string;
    }
    return err.message || 'An unexpected error occurred.';
  }

  // Called by SearchForm when the user submits a new search
  function handleSearch(req: SearchRequest) {
    const fullReq: SearchRequest = {
      ...req,
      page: 1,
      page_size: DEFAULT_PAGE_SIZE,
      sort_by: searchRequest?.sort_by,
      sort_order: searchRequest?.sort_order,
    };
    setSearchRequest(fullReq);
    mutation.mutate(fullReq);
  }

  // Called by ResultsTable when the user clicks a sort column
  function handleSortChange(sortBy: SortColumn, sortOrder: SortOrder) {
    if (!searchRequest) return;
    const updated: SearchRequest = {
      ...searchRequest,
      sort_by: sortBy,
      sort_order: sortOrder,
      page: 1, // reset to page 1 on sort change
    };
    setSearchRequest(updated);
    mutation.mutate(updated);
  }

  // Called by ResultsTable when the user changes the page
  function handlePageChange(page: number) {
    if (!searchRequest) return;
    const updated: SearchRequest = { ...searchRequest, page };
    setSearchRequest(updated);
    mutation.mutate(updated);
  }

  const data = mutation.data;
  const isLoading = mutation.isPending;
  const isError = mutation.isError;
  const error = mutation.error;

  // Provide a sensible default pagination so ResultsTable never receives undefined
  const pagination = data?.pagination ?? {
    page: 1,
    page_size: DEFAULT_PAGE_SIZE,
    total_records: 0,
    total_pages: 1,
  };

  return (
    <div style={styles.page}>
      <Navbar />

      <main style={styles.main}>
        {/* Search form section */}
        <section style={styles.section} aria-label="Search filters">
          <h1 style={styles.pageTitle}>Supply Chain Search</h1>
          <div style={styles.card}>
            <SearchForm onSearch={handleSearch} isLoading={isLoading} />
          </div>

          {/* API error message shown below the form */}
          {isError && error && (
            <div role="alert" style={styles.errorBanner}>
              {getErrorMessage(error)}
            </div>
          )}
        </section>

        {/* Results section — only shown after a search has been executed */}
        {(isLoading || data) && (
          <>
            {/* Summary card */}
            <section style={styles.section} aria-label="Search summary">
              {isLoading ? (
                <div style={styles.loadingState} role="status" aria-live="polite">
                  Loading…
                </div>
              ) : (
                <SummaryCard summary={data?.summary ?? null} />
              )}
            </section>

            {!isLoading && data && searchRequest?.material_code && (data.vendor_comparison?.length ?? 0) > 1 && (
              <section style={styles.section} aria-label="Vendor comparison">
                <VendorComparisonChart vendors={data.vendor_comparison} />
              </section>
            )}

            {/* Results table */}
            {!isLoading && data && (
              <section style={styles.section} aria-label="Search results">
                <ResultsTable
                  records={data.records}
                  pagination={pagination}
                  onSortChange={handleSortChange}
                  onPageChange={handlePageChange}
                  currentSortBy={searchRequest?.sort_by}
                  currentSortOrder={searchRequest?.sort_order}
                />
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f4f3f5',
    display: 'flex',
    flexDirection: 'column',
  },
  main: {
    flex: 1,
    maxWidth: '1280px',
    width: '100%',
    margin: '0 auto',
    padding: '24px 24px 48px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  pageTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#08060d',
    margin: '0 0 16px 0',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e4e7',
    borderRadius: '6px',
    padding: '20px 24px',
  },
  errorBanner: {
    marginTop: '12px',
    backgroundColor: '#fdf0ef',
    border: '1px solid #e8c4c0',
    borderRadius: '5px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#922b21',
  },
  loadingState: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e4e7',
    borderRadius: '6px',
    padding: '32px 24px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#6b6375',
  },
};
