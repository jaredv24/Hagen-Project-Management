import { useEffect, useState } from "react";

interface CommitFieldProps {
  value: string;
  disabled?: boolean;
  onCommit: (value: string) => void;
  list?: string;
  placeholder?: string;
  ariaHighlight?: boolean;
  multiline?: boolean;
  rows?: number;
}

// Mirrors the original app's native `onchange` (fires on blur when the value
// actually changed) rather than firing a save on every keystroke.
export function CommitField({ value, disabled, onCommit, list, placeholder, ariaHighlight, multiline, rows }: CommitFieldProps) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const commit = () => {
    if (local !== value) onCommit(local);
  };

  if (multiline) {
    return (
      <textarea
        rows={rows}
        disabled={disabled}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
      />
    );
  }

  return (
    <input
      disabled={disabled}
      value={local}
      list={list}
      placeholder={placeholder}
      data-ai-highlight={ariaHighlight ? "1" : undefined}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
    />
  );
}
