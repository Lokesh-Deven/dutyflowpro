'use server';

/**
 * @fileOverview Summarizes potential duty conflicts or overloads for specific invigilators.
 *
 * - summarizeDutyConflicts - A function that summarizes duty conflicts for an invigilator.
 * - SummarizeDutyConflictsInput - The input type for the summarizeDutyConflicts function.
 * - SummarizeDutyConflictsOutput - The return type for the summarizeDutyConflicts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeDutyConflictsInputSchema = z.object({
  invigilatorName: z.string().describe('The name of the invigilator to summarize duty conflicts for.'),
  duties: z.array(
    z.object({
      date: z.string().describe('The date of the duty.'),
      subject: z.string().describe('The subject of the duty.'),
      startTime: z.string().describe('The start time of the duty.'),
      endTime: z.string().describe('The end time of the duty.'),
      numberOfRooms: z.number().describe('The number of rooms for the duty.'),
    })
  ).describe('A list of duties assigned to the invigilator.'),
});
export type SummarizeDutyConflictsInput = z.infer<typeof SummarizeDutyConflictsInputSchema>;

const SummarizeDutyConflictsOutputSchema = z.object({
  summary: z.string().describe('A summary of potential duty conflicts or overloads for the invigilator.'),
});
export type SummarizeDutyConflictsOutput = z.infer<typeof SummarizeDutyConflictsOutputSchema>;

export async function summarizeDutyConflicts(input: SummarizeDutyConflictsInput): Promise<SummarizeDutyConflictsOutput> {
  return summarizeDutyConflictsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeDutyConflictsPrompt',
  input: {schema: SummarizeDutyConflictsInputSchema},
  output: {schema: SummarizeDutyConflictsOutputSchema},
  prompt: `You are an expert in scheduling and conflict resolution.

  Given the following invigilator's name and duties, summarize any potential conflicts or overloads.

  Invigilator Name: {{{invigilatorName}}}
  Duties:
  {{#each duties}}
  - Date: {{{date}}}, Subject: {{{subject}}}, Start Time: {{{startTime}}}, End Time: {{{endTime}}}, Number of Rooms: {{{numberOfRooms}}}
  {{/each}}

  Consider potential conflicts such as overlapping times, too many rooms to cover at once, and generally heavy workloads.
  Provide a concise summary of any issues.
  `,
});

const summarizeDutyConflictsFlow = ai.defineFlow(
  {
    name: 'summarizeDutyConflictsFlow',
    inputSchema: SummarizeDutyConflictsInputSchema,
    outputSchema: SummarizeDutyConflictsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
