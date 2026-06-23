import { useState, type FormEvent, type FocusEvent } from 'react';
import type { SearchRequest } from '../types';

// Validation regexes per requirements 4.3, 4.4, 4.5
const MATERIAL_CODE_PATTERN = /^\d{8}$/;
const VENDOR_CODE_PATTERN = /^\d{8}$/;
const PLANT_CODE_PATTERN = /^[a-zA-Z0-9]{4}$/;

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
  if (startDate && endDate && endDate < startDate) {
    return 'End Date must be on or after Start Date.';
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
    return (_e: FocusEvent<HTMLInputElement>) => {
      setErrors((prev) => {
        const updated = { ...prev };
        if (field === 'material_code') updated.material_code = validateMaterialCode(materialCode);
        if (field === 'vendor_code') updated.vendor_code = validateVendorCode(vendorCode);
        if (field === 'plant_code') updated.plant_code = validatePlantCode(plantCode);
        if (field === 'end_date') updated.end_date = validateDateRange(startDate, endDate);
        if (field === 'start_date') updated.start_date = '';
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
    const dateErr = validateDateRange(startDate, endDate);

    setErrors({
      material_code: materialErr,
      vendor_code: vendorErr,
      plant_code: plantErr,
      start_date: '',
      end_date: dateErr,
    });

    if (materialErr || vendorErr || plantErr || dateErr) {
      return;
    }

    // Requirement 4.2: at least one of material/vendor/plant must be provided
    if (!materialCode && !vendorCode && !plantCode) {
      setFormError('At least one of Material Code, Vendor Code, or Plant Code is required.');
      return;
    }

    const request: SearchRequest = {
      page: 1,
      page_size: 50,
    };

    if (materialCode) request.material_code = materialCode;
    if (vendorCode) request.vendor_code = vendorCode;
    if (plantCode) request.plant_code = plantCode;
    if (startDate) request.start_date = startDate;
    if (endDate) request.end_date = endDate;

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
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (errors.end_date) {
                setErrors((prev) => ({ ...prev, end_date: validateDateRange(e.target.value, endDate) }));
              }
            }}
            onBlur={handleBlur('start_date')}
            style={styles.input}
            disabled={isLoading}
          />
        </div>

        {/* End Date */}
        <div style={styles.fieldGroup}>
          <label htmlFor="end-date" style={styles.label}>
            End Date
          </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setErrors((prev) => ({ ...prev, end_date: validateDateRange(startDate, e.target.value) }));
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
