import { config } from 'dotenv';
config();

import '@/ai/flows/generate-allotment-suggestions.ts';
import '@/ai/flows/summarize-duty-conflicts.ts';
import '@/ai/flows/optimize-duty-assignments.ts';
import '@/ai/flows/rebalance-duties.ts';
import '@/ai/flows/send-email.ts';
import '@/ai/flows/send-bulk-emails.ts';
