# **App Name**: DutyFlow

## Core Features:

- User Authentication: Secure user authentication via email/password with Firebase.
- Institution Name Prefill: Automatically pre-fill the Institution Name in forms after login.
- Navigation: Persistent header with navigation links: New Allotment, Saved Allotments, History, Day-wise Schedule, Analytics, About.
- Invigilator Details: Form to add invigilators with fields: Name, Designation, Mobile No, E-Mail ID, part-time availability. Display added invigilators in a table with action buttons for edit/delete. Bulk add via Excel upload.
- Examination Details: Form to add examinations with fields: Date, Subject, Start Time, End Time, Number of Rooms, Number of Relievers, Name of the College, Name of the Examination. Bulk add via Excel upload. Includes a 'Generate Duty Allotment' button.
- Duty Allotment Sheet: Display a 'Duty Allotment Sheet' as an editable grid/table with rows as Invigilators and columns as Examinations. Cells have duty on/off toggle. Includes totals row/column calculations and visual cues for discrepancies.
- optimizeDutyAssignments: Placeholder Genkit flow that takes in all the allotment requirements, and attempts to satisfy them by optimizing all the known hard and soft constraints using a tool. This feature is not functional in the MVP.
- rebalanceDuties: Placeholder Genkit flow for rebalancing existing duties among invigilators, and adjusting assignments when invigilators have too many conflicts in their existing duties using a tool. This feature is not functional in the MVP.
- sendEmail: Placeholder Genkit flow that will call an email-sending backend function for transactional emails (eg: single user allotment emails). This feature is not functional in the MVP.
- sendBulkEmails: Placeholder Genkit flow that can dispatch a bulk email flow to multiple users. For instance: when an entire invigilator class requires an updated notice for one of their scheduled tasks. This feature is not functional in the MVP.
- Individual Dashboard: Tab with a dropdown to select an invigilator; shows a formatted summary card for that invigilator's duties.
- Export Options: Functionality to download the main allotment sheet and individual summaries as PDFs.
- Email Functionality: Functionality to send individual summary PDFs via email and 'Email All Summaries' in bulk.

## Style Guidelines:

- Primary color: Blue (#29ABE2) to convey professionalism and trust, fitting for an educational tool.
- Background: Light gray (#F0F2F5) to provide a clean, neutral backdrop that is easy on the eyes.
- Accent: Green (#228B22) to highlight important actions and confirmations, signaling positive outcomes.
- Font pairing: 'Inter' (sans-serif) for body text and 'Space Grotesk' (sans-serif) for headlines, offering a balance of readability and a modern, tech-forward aesthetic.
- Code Font: 'Source Code Pro' for displaying code snippets.
- Lucide React icons for a consistent, clean, and modern visual language.
- Card-based UI for authentication forms, providing a structured and professional visual.
- Responsive design that adapts to both desktop and mobile screens, ensuring accessibility across devices.
- Subtle transitions and animations to enhance user experience (e.g., fade-in effects, loading spinners).