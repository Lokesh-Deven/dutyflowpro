'use server';

/**
 * @fileOverview A flow that generates duty allotment suggestions based on invigilator availability and exam requirements.
 *
 * - generateAllotmentSuggestions - A function that generates duty allotment suggestions.
 * - GenerateAllotmentSuggestionsInput - The input type for the generateAllotmentSuggestions function.
 * - GenerateAllotmentSuggestionsOutput - The return type for the generateAllotmentSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAllotmentSuggestionsInputSchema = z.object({
  invigilatorAvailability: z.string().describe('A description of invigilator availabilities.'),
  examRequirements: z.string().describe('A description of the exam requirements.'),
});
export type GenerateAllotmentSuggestionsInput = z.infer<typeof GenerateAllotmentSuggestionsInputSchema>;

const GenerateAllotmentSuggestionsOutputSchema = z.object({
  allotmentSuggestions: z.string().describe('The generated duty allotment suggestions.'),
});
export type GenerateAllotmentSuggestionsOutput = z.infer<typeof GenerateAllotmentSuggestionsOutputSchema>;

export async function generateAllotmentSuggestions(
  input: GenerateAllotmentSuggestionsInput
): Promise<GenerateAllotmentSuggestionsOutput> {
  return generateAllotmentSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAllotmentSuggestionsPrompt',
  input: {schema: GenerateAllotmentSuggestionsInputSchema},
  output: {schema: GenerateAllotmentSuggestionsOutputSchema},
  prompt: `You are an expert in generating duty allotment suggestions based on invigilator availability and exam requirements. Use the following information to create the suggestions.\n\nInvigilator Availability: {{{invigilatorAvailability}}}\nExam Requirements: {{{examRequirements}}}\n\nSuggest a duty allotment sheet in plain text.`,
});

const generateAllotmentSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateAllotmentSuggestionsFlow',
    inputSchema: GenerateAllotmentSuggestionsInputSchema,
    outputSchema: GenerateAllotmentSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
