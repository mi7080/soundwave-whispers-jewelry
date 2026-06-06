// US shipping validation helpers. The store ships to the US only, so address
// fields are validated against USPS state codes, US ZIP format, and US phone
// numbers normalized to E.164 (+1XXXXXXXXXX).

export const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

export const US_STATE_CODES: Set<string> = new Set(US_STATES.map((s) => s.code));

export const isUsStateCode = (code: string | undefined | null): boolean =>
  !!code && US_STATE_CODES.has(code.trim().toUpperCase());

// Accepts 12345 or 12345-6789.
export const ZIP_RE = /^\d{5}(-\d{4})?$/;

export const isUsZip = (zip: string | undefined | null): boolean =>
  !!zip && ZIP_RE.test(zip.trim());

// Normalize a US phone to E.164 (+1XXXXXXXXXX). Strips formatting; accepts a
// bare 10-digit number or an 11-digit number with a leading country code 1.
// Returns null when the input is not a valid US number.
export const normalizeUsPhone = (raw: string | undefined | null): string | null => {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  let local: string;
  if (digits.length === 10) {
    local = digits;
  } else if (digits.length === 11 && digits.startsWith("1")) {
    local = digits.slice(1);
  } else {
    return null;
  }
  // US area codes and exchange codes never start with 0 or 1.
  if (local[0] === "0" || local[0] === "1") return null;
  return `+1${local}`;
};
