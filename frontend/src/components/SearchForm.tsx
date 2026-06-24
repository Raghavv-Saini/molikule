import { useState, type FormEvent } from 'react';
import type { SearchRequest } from '../types';

// Validation regexes per requirements 4.3, 4.4, 4.5
const MATERIAL_CODE_PATTERN = /^\d{8}$/;
const VENDOR_CODE_PATTERN = /^\d{8}$/;
const PLANT_CODE_PATTERN = /^[a-zA-Z0-9]{4}$/;

// Date input is entered as DD MM YYYY and submitted to the API as YYYY-MM-DD.
const DATE_INPUT_PATTERN = /^(\d{2}) (\d{2}) (\d{4})$/;

function formatDateEntry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join(' ');
}

/**
 * Convert a DD MM YYYY date input value to YYYY-MM-DD.
 * Returns null if the input is empty or invalid.
 */
function parseDateInput(value: string): string | null {
  if (!value) return null;
  const m = DATE_INPUT_PATTERN.exec(value);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const year = parseInt(yyyy, 10);
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1900 || year > 2100) return null;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return `${yyyy}-${mm}-${dd}`;
}

function validateDateField(value: string): string {
  if (!value) return '';
  if (!DATE_INPUT_PATTERN.test(value)) return 'Date must be in DD MM YYYY format.';
  if (parseDateInput(value) === null) return 'Invalid date.';
  return '';
}

interface SearchFormProps {
  onSearch: (request: SearchRequest) => void;
  isLoading?: boolean;
}

interface FieldErrors {
  material_code: string;
  vendor_code: string;
  plant_code: string;
  start_date: string;
  end_date: string;
}

function validateMaterialCode(value: string): string {
  if (value && !MATERIAL_CODE_PATTERN.test(value)) {
    return 'Material Code must be exactly 8 numeric digits.';
  }
  return '';
}

function validateVendorCode(value: string): string {
  if (value && !VENDOR_CODE_PATTERN.test(value)) {
    return 'Vendor Code must be exactly 8 numeric digits.';
  }
  return '';
}

function validatePlantCode(value: string): string {
  if (value && !PLANT_CODE_PATTERN.test(value)) {
    return 'Plant Code must be exactly 4 alphanumeric characters.';
  }
  return '';
}

function validateDateRange(startDate: string, endDate: string): string {
  if (startDate && endDate) {
    const startIso = parseDateInput(startDate);
    const endIso = parseDateInput(endDate);
    if (startIso && endIso && endIso < startIso) {
      return 'End Date must be on or after Start Date.';
    }
  }
  return '';
}

export function SearchForm({ onSearch, isLoading = false }: SearchFormProps) {
  const [materialCode, setMaterialCode] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [plantCode, setPlantCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [errors, setErrors] = useState<FieldErrors>({
    material_code: '',
    vendor_code: '',
    plant_code: '',
    start_date: '',
    end_date: '',
  });
  const [formError, setFormError] = useState('');

  function handleBlur(field: keyof FieldErrors) {
    return () => {
      setErrors((prev) => {
        const updated = { ...prev };
        if (field === 'material_code') updated.material_code = validateMaterialCode(materialCode);
        if (field === 'vendor_code') updated.vendor_code = validateVendorCode(vendorCode);
        if (field === 'plant_code') updated.plant_code = validatePlantCode(plantCode);
        if (field === 'start_date') updated.start_date = validateDateField(startDate);
        if (field === 'end_date') {
          updated.end_date = validateDateField(endDate) || validateDateRange(startDate, endDate);
        }
        return updated;
      });
    };
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError('');

    // Validate all fields
    const materialErr = validateMaterialCode(materialCode);
    const vendorErr = validateVendorCode(vendorCode);
    const plantErr = validatePlantCode(plantCode);
    const startDateErr = validateDateField(startDate);
    const endDateErr = validateDateField(endDate);
    const dateErr = !startDateErr && !endDateErr ? validateDateRange(startDate, endDate) : '';

    setErrors({
      material_code: materialErr,
      vendor_code: vendorErr,
      plant_code: plantErr,
      start_date: startDateErr,
      end_date: endDateErr || dateErr,
    });

    if (materialErr || vendorErr || plantErr || startDateErr || endDateErr || dateErr) {
      return;
    }

    if (!materialCode && !vendorCode && !plantCode && !startDate && !endDate) {
      setFormError('Enter at least one code or a start/end date.');
      return;
    }

    const request: SearchRequest = {
      page: 1,
      page_size: 50,
    };

    if (materialCode) request.material_code = materialCode;
    if (vendorCode) request.vendor_code = vendorCode;
    if (plantCode) request.plant_code = plantCode;
    const startIso = parseDateInput(startDate);
    const endIso = parseDateInput(endDate);
    if (startIso) request.start_date = startIso;
    if (endIso) request.end_date = endIso;

    onSearch(request);
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Search purchase records">
      <div style={styles.grid}>
        {/* Material Code */}
        <div style={styles.fieldGroup}>
          <label htmlFor="material-code" style={styles.label}>
            Material Code
          </label>
          <input
            id="material-code"
            type="text"
            inputMode="numeric"
            maxLength={8}
            placeholder="8-digit code"
            value={materialCode}
            onChange={(e) => {
              setMaterialCode(e.target.value);
              if (errors.material_code) {
                setErrors((prev) => ({ ...prev, material_code: validateMaterialCode(e.target.value) }));
              }
            }}
            onBlur={handleBlur('material_code')}
            aria-describedby={errors.material_code ? 'material-code-error' : undefined}
            aria-invalid={errors.material_code ? true : undefined}
            style={{ ...styles.input, ...(errors.material_code ? styles.inputError : {}) }}
            disabled={isLoading}
          />
          {errors.material_code && (
            <span id="material-code-error" role="alert" style={styles.errorText}>
              {errors.material_code}
            </span>
          )}
        </div>

        {/* Vendor Code */}
        <div style={styles.fieldGroup}>
          <label htmlFor="vendor-code" style={styles.label}>
            Vendor Code
          </label>
          <input
            id="vendor-code"
            type="text"
            inputMode="numeric"
            maxLength={8}
            placeholder="8-digit code"
            value={vendorCode}
            onChange={(e) => {
              setVendorCode(e.target.value);
              if (errors.vendor_code) {
                setErrors((prev) => ({ ...prev, vendor_code: validateVendorCode(e.target.value) }));
              }
            }}
            onBlur={handleBlur('vendor_code')}
            aria-describedby={errors.vendor_code ? 'vendor-code-error' : undefined}
            aria-invalid={errors.vendor_code ? true : undefined}
            style={{ ...styles.input, ...(errors.vendor_code ? styles.inputError : {}) }}
            disabled={isLoading}
          />
          {errors.vendor_code && (
            <span id="vendor-code-error" role="alert" style={styles.errorText}>
              {errors.vendor_code}
            </span>
          )}
        </div>

        {/* Plant Code */}
        <div style={styles.fieldGroup}>
          <label htmlFor="plant-code" style={styles.label}>
            Plant Code
          </label>
          <input
            id="plant-code"
            type="text"
            maxLength={4}
            placeholder="4-char code"
            value={plantCode}
            onChange={(e) => {
              setPlantCode(e.target.value);
              if (errors.plant_code) {
                setErrors((prev) => ({ ...prev, plant_code: validatePlantCode(e.target.value) }));
              }
            }}
            onBlur={handleBlur('plant_code')}
            aria-describedby={errors.plant_code ? 'plant-code-error' : undefined}
            aria-invalid={errors.plant_code ? true : undefined}
            style={{ ...styles.input, ...(errors.plant_code ? styles.inputError : {}) }}
            disabled={isLoading}
          />
          {errors.plant_code && (
            <span id="plant-code-error" role="alert" style={styles.errorText}>
              {errors.plant_code}
            </span>
          )}
        </div>

        {/* Start Date */}
        <div style={styles.fieldGroup}>
          <label htmlFor="start-date" style={styles.label}>
            Start Date
          </label>
          <input
            id="start-date"
            type="text"
            inputMode="numeric"
            placeholder="DD MM YYYY"
            maxLength={10}
            value={startDate}
            onChange={(e) => {
              const nextValue = formatDateEntry(e.target.value);
              setStartDate(nextValue);
              if (errors.end_date) {
                setErrors((prev) => ({ ...prev, end_date: validateDateRange(nextValue, endDate) }));
              }
              if (errors.start_date) {
                setErrors((prev) => ({ ...prev, start_date: validateDateField(nextValue) }));
              }
            }}
            onBlur={handleBlur('start_date')}
            aria-describedby={errors.start_date ? 'start-date-error' : undefined}
            aria-invalid={errors.start_date ? true : undefined}
            style={{ ...styles.input, ...(errors.start_date ? styles.inputError : {}) }}
            disabled={isLoading}
          />
          {errors.start_date && (
            <span id="start-date-error" role="alert" style={styles.errorText}>
              {errors.start_date}
            </span>
          )}
        </div>

        {/* End Date */}
        <div style={styles.fieldGroup}>
          <label htmlFor="end-date" style={styles.label}>
            End Date
          </label>
          <input
            id="end-date"
            type="text"
            inputMode="numeric"
            placeholder="DD MM YYYY"
            maxLength={10}
            value={endDate}
            onChange={(e) => {
              const nextValue = formatDateEntry(e.target.value);
              setEndDate(nextValue);
              setErrors((prev) => ({
                ...prev,
                end_date: validateDateField(nextValue) || validateDateRange(startDate, nextValue),
              }));
            }}
            onBlur={handleBlur('end_date')}
            aria-describedby={errors.end_date ? 'end-date-error' : undefined}
            aria-invalid={errors.end_date ? true : undefined}
            style={{ ...styles.input, ...(errors.end_date ? styles.inputError : {}) }}
            disabled={isLoading}
          />
          {errors.end_date && (
            <span id="end-date-error" role="alert" style={styles.errorText}>
              {errors.end_date}
            </span>
          )}
        </div>
      </div>

      {/* Form-level error (Requirement 4.2) */}
      {formError && (
        <div role="alert" style={styles.formError}>
          {formError}
        </div>
      )}

      {/* Submit row */}
      <div style={styles.submitRow}>
        <button
          type="submit"
          disabled={isLoading}
          aria-disabled={isLoading}
          style={{
            ...styles.submitButton,
            ...(isLoading ? styles.submitButtonDisabled : {}),
          }}
        >
          {isLoading ? (
            <span style={styles.loadingInner}>
              <span style={styles.spinner} aria-hidden="true" />
              Searching…
            </span>
          ) : (
            'Search'
          )}
        </button>
      </div>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#08060d',
    marginBottom: '5px',
  },
  input: {
    fontSize: '14px',
    lineHeight: '1.5',
    padding: '8px 10px',
    border: '1px solid #e5e4e7',
    borderRadius: '5px',
    color: '#08060d',
    backgroundColor: '#fff',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  },
  inputError: {
    borderColor: '#c0392b',
  },
  errorText: {
    marginTop: '4px',
    fontSize: '12px',
    color: '#c0392b',
  },
  formError: {
    backgroundColor: '#fdf0ef',
    border: '1px solid #e8c4c0',
    borderRadius: '5px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#922b21',
    marginBottom: '16px',
  },
  submitRow: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  submitButton: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#ffffff',
    backgroundColor: '#08060d',
    border: 'none',
    borderRadius: '5px',
    padding: '9px 24px',
    cursor: 'pointer',
    minWidth: '100px',
    transition: 'background-color 0.15s',
  },
  submitButtonDisabled: {
    backgroundColor: '#6b6375',
    cursor: 'not-allowed',
  },
  loadingInner: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  spinner: {
    display: 'inline-block',
    width: '13px',
    height: '13px',
    border: '2px solid rgba(255,255,255,0.4)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
};
