import { useEffect, useState } from "react";
import { displayToIsoDate, formatDateAsTyped, isoToDisplayDate } from "../lib/dates";

export function DateField({
  label,
  iso,
  disabled,
  aiHighlight,
  onCommit,
}: {
  label: string;
  iso: string | null;
  disabled?: boolean;
  aiHighlight?: boolean;
  onCommit: (iso: string | null) => void;
}) {
  const [value, setValue] = useState(isoToDisplayDate(iso));

  useEffect(() => {
    setValue(isoToDisplayDate(iso));
  }, [iso]);

  return (
    <div className="td-field">
      <label>{label}</label>
      <input
        type="text"
        inputMode="numeric"
        maxLength={10}
        placeholder="MM/DD/YYYY"
        className="mono"
        disabled={disabled}
        data-ai-highlight={aiHighlight ? "1" : undefined}
        value={value}
        onChange={(e) => setValue(formatDateAsTyped(e.target.value))}
        onBlur={() => {
          const { iso: newIso, valid } = displayToIsoDate(value);
          if (!valid) {
            alert("That date doesn’t look right — use MM/DD/YYYY.");
            setValue(isoToDisplayDate(iso));
            return;
          }
          setValue(isoToDisplayDate(newIso));
          if (newIso !== iso) onCommit(newIso);
        }}
      />
    </div>
  );
}
