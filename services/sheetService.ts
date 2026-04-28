import { VerifiedLead, PriorityTier, StoredLeadOverride } from '../types';

const SHEET_ID = '1WIZDf107pz7GV2OwM9gh9XD6In26JnzFNqtjmTnL0F4';
const GID = '1321590502';
// We use gviz/tq since it supports CORS natively, avoiding the need for proxy services in production
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;
export const STORAGE_KEY = 'verified_leads_crm_v1';

// Parse CSV respecting quoted fields
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cols: string[] = [];
  let cur = '';
  let inQuote = false;
  
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    
    if (inQuote) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          cur += '"';
          i++; // Skip escaped quote
        } else {
          inQuote = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ',') {
        cols.push(cur.trim());
        cur = '';
      } else if (ch === '\n' || (ch === '\r' && text[i+1] === '\n')) {
        if (ch === '\r') i++; // Skip the \n part of \r\n
        cols.push(cur.trim());
        rows.push(cols);
        cols = [];
        cur = '';
      } else if (ch !== '\r') {
        cur += ch;
      }
    }
  }
  
  if (cur.length > 0 || cols.length > 0) {
    cols.push(cur.trim());
    rows.push(cols);
  }
  
  return rows.filter(row => row.some(col => col.length > 0)); // Filter out completely empty rows
}

// Indian number words to digits
const wordMap: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
  lakh: 100000, lac: 100000, crore: 10000000,
};

function parseBudgetText(text: string): number {
  if (!text) return 0;
  const lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');

  // If it already contains digits, extract them
  const digitMatch = lower.match(/(\d[\d,]*)/);
  if (digitMatch) {
    return parseInt(digitMatch[1].replace(/,/g, ''), 10);
  }

  // Word-based parsing
  const words = lower.split(/\s+/);
  let total = 0;
  let current = 0;
  for (const word of words) {
    const val = wordMap[word];
    if (val === undefined) continue;
    if (val === 1000 || val === 100000 || val === 10000000) {
      current = current === 0 ? val : current * val;
      total += current;
      current = 0;
    } else if (val === 100) {
      current = current === 0 ? 100 : current * 100;
    } else {
      current += val;
    }
  }
  total += current;
  return total;
}

function calcPriorityScore(
  timeline: string,
  budgetNum: number,
  sentiment: string,
  openToNearby: string
): number {
  let score = 0;

  if (timeline.toLowerCase().includes('immediate') || timeline.toLowerCase().includes('now')) {
    score += 50;
  }

  if (budgetNum > 25000) score += 30;
  else if (budgetNum >= 15000) score += 20;
  else if (budgetNum > 0) score += 10;

  if (sentiment.toLowerCase() === 'positive') score += 20;

  if (openToNearby.toLowerCase().includes('yes')) score += 5;

  return Math.min(score, 100);
}

function scoreToPriorityTier(score: number): PriorityTier {
  if (score >= 70) return 'HOT';
  if (score >= 40) return 'WARM';
  return 'COOL';
}

export async function fetchVerifiedLeads(): Promise<VerifiedLead[]> {
  const res = await fetch(CSV_URL);
  const text = await res.text();
  const rows = parseCSV(text);

  if (rows.length < 2) return [];

  // DEBUG: log full callerDetails of first 2 rows to find phone field format
  console.warn('ROW1 callerDetails (full):', JSON.stringify(rows[1]?.[1]));
  console.warn('ROW2 callerDetails (full):', JSON.stringify(rows[2]?.[1]));

  // Row 0 is header, skip it
  const dataRows = rows.slice(1);

  const savedOverrides: Record<string, StoredLeadOverride> = JSON.parse(
    localStorage.getItem(STORAGE_KEY) || '{}'
  );

  const leads: VerifiedLead[] = [];

  for (const row of dataRows) {
    // Actual columns (confirmed from sheet):
    // 0: Date, 1: Caller details, 2: call id, 3: transcript,
    // 4: Call Summary, 5: Sentiment, 6: duration, 7: recording url,
    // 8: user_timeline, 9: user_budget, 10: user_furniturepereference,
    // 11: user_propertyname/size, 12: user_opentonearbyareas
    const dateStr = row[0] || '';
    const callerDetails = row[1] || '';
    const callId = row[2] || '';
    const callSummary = row[4] || '';
    const sentiment = row[5] || '';
    const timeline = row[8] || '';
    const budget = row[9] || '';
    const furniturePref = row[10] || '';
    const propertyMatch = row[11] || '';
    const openToNearby = row[12] || '';

    const callDate = dateStr ? new Date(dateStr) : null;

    if (!callId) continue;

    // Parse caller details with newlines and colons
    const extractField = (text: string, fieldName: string) => {
      const match = text.match(new RegExp(`${fieldName}\\s*:\\s*(.*)`, 'i'));
      return match ? match[1].trim() : '';
    };

    // Skip sub-header rows that are literally "Caller details"
    if (callerDetails.trim().toLowerCase() === 'caller details') continue;

    const name = extractField(callerDetails, 'Name') || 'Unknown';
    const propertyType = extractField(callerDetails, 'Property Type');
    const email = extractField(callerDetails, 'Email');
    const preferredLocation = extractField(callerDetails, 'Prefered location') || extractField(callerDetails, 'Preferred location');
    const phone = extractField(callerDetails, 'Phone') || extractField(callerDetails, 'Mobile') || extractField(callerDetails, 'Contact') || extractField(callerDetails, 'Number') || '';

    const budgetNum = parseBudgetText(budget);
    const priorityScore = calcPriorityScore(timeline, budgetNum, sentiment, openToNearby);
    const priorityTier = scoreToPriorityTier(priorityScore);

    const override = savedOverrides[callId];

    leads.push({
      id: callId,
      rawId: callId,
      name,
      phone,
      propertyType,
      email,
      preferredLocation,
      callSummary,
      sentiment,
      timeline,
      budget,
      budgetNum,
      furniturePref,
      propertyMatch,
      openToNearby,
      priorityScore,
      priorityTier,
      stage: override?.stage ?? 'new',
      notes: override?.notes ?? '',
      callDate,
    });
  }

  // Sort by priority score descending
  leads.sort((a, b) => b.priorityScore - a.priorityScore);

  return leads;
}

export function saveLeadOverride(id: string, override: StoredLeadOverride) {
  const all: Record<string, StoredLeadOverride> = JSON.parse(
    localStorage.getItem(STORAGE_KEY) || '{}'
  );
  all[id] = override;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
