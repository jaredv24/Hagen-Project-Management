export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

export function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function isoToDisplayDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return "";
  const [y, m, d] = parts;
  return `${m}/${d}/${y}`;
}

export function displayToIsoDate(display: string | null | undefined): { iso: string | null; valid: boolean } {
  const s = (display || "").trim();
  if (s === "") return { iso: null, valid: true };
  let mm: string, dd: string, yyyy: string;
  const sep = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/);
  if (sep) {
    mm = sep[1].padStart(2, "0");
    dd = sep[2].padStart(2, "0");
    yyyy = sep[3].length === 2 ? "20" + sep[3] : sep[3];
  } else {
    const digits = s.replace(/[^0-9]/g, "");
    if (digits.length === 0) return { iso: null, valid: true };
    if (digits.length === 8) {
      mm = digits.slice(0, 2);
      dd = digits.slice(2, 4);
      yyyy = digits.slice(4, 8);
    } else if (digits.length === 6) {
      mm = digits.slice(0, 2);
      dd = digits.slice(2, 4);
      yyyy = "20" + digits.slice(4, 6);
    } else {
      return { iso: null, valid: false };
    }
  }
  const m = parseInt(mm, 10),
    d = parseInt(dd, 10),
    y = parseInt(yyyy, 10);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return { iso: null, valid: false };
  }
  return { iso: `${yyyy}-${mm}-${dd}`, valid: true };
}

export function formatDateAsTyped(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 8);
  if (digits.length > 4) return digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
  if (digits.length > 2) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

export function isPlausibleProjectNumber(val: string | null | undefined): boolean {
  if (!val) return false;
  const m = String(val).trim().match(/^(\d{4})-(\d{2,3})$/);
  if (!m) return false;
  const year = parseInt(m[1], 10);
  const currentYear = new Date().getFullYear();
  return year >= 2020 && year <= currentYear + 1;
}
