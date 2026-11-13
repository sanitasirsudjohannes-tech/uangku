import { useId } from 'react';
import { formatAmountInput } from '../../core/currency.js';

/**
 * Input nominal dengan pemisah ribuan otomatis.
 * Nilai yang dikirim ke pemanggil adalah digit mentah (tanpa titik).
 */
export default function MoneyInput({ value, onChange, error, autoFocus, disabled }) {
  const inputId = useId();

  const handleChange = (event) => {
    const digits = event.target.value.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');
    onChange(digits);
  };

  return (
    <div>
      <label className="label" htmlFor={inputId}>
        Nominal
      </label>
      <div
        className={`flex items-center gap-3 rounded-xl border bg-surface-2 px-3.5 py-3 transition focus-within:bg-surface focus-within:ring-2 ${
          error
            ? 'border-expense focus-within:border-expense focus-within:ring-expense/25'
            : 'border-line focus-within:border-brand focus-within:ring-brand/25'
        }`}
      >
        <span className="text-lg font-semibold text-muted">Rp</span>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="done"
          placeholder="0"
          value={formatAmountInput(value)}
          onChange={handleChange}
          autoFocus={autoFocus}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className="tabular w-full min-w-0 bg-transparent text-2xl font-bold tracking-tight outline-none placeholder:font-semibold placeholder:text-muted/40"
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs font-medium text-expense">
          {error}
        </p>
      ) : null}
    </div>
  );
}
