---
trigger: always_on
---

# Invigilator Monogram and Duty Metric Rules

These rules must be strictly followed whenever rendering invigilator avatars, monograms, or duty metrics on UI screens (such as the Individual Dashboard) and on exported documents (such as the Invigilator's Duty Summary PDF):

## 1. Monogram Initial Extraction Rule
- When displaying a monogram/initial letter for an invigilator:
  - Consider **ONLY** the letter of the **FIRST NAME** of the invigilator.
  - **DO NOT** use the first letters of titles or honorifics like "Mr", "Ms", "Mrs", "Dr", "Prof", "Professor", "Shri", "Smt", "Sri", "Er", "Rev", etc.
  - Titles can appear with or without a period (`.`) and with or without spacing:
    - Example: `"Mrs.Shobha"` -> The monogram MUST be **"S"** (never "M").
    - Example: `"Prof.Ravikanth"` -> The monogram MUST be **"R"** (never "P").
    - Example: `"Dr. Ramesh"` -> The monogram MUST be **"R"** (never "D").
    - Example: `"Mr. Suresh"` -> The monogram MUST be **"S"** (never "M").
    - Example: `"Prof. Dr. Anita"` -> The monogram MUST be **"A"**.
  - Always use the centralized helper function `getInvigilatorInitial(name)` from `@/lib/utils`.

## 2. Monogram Size & Centering
- The monogram letter must cover **at least 50% of the circle / space provided**.
- The monogram letter must be placed **strictly at the exact center** of the circular avatar badge:
  - **In UI (Individual Dashboard)**: Avatar fallback must use at least 50% container height (e.g. `text-5xl` or `text-[50px] font-bold` for a 96px circle) and remain vertically and horizontally centered with `leading-none flex items-center justify-center`.
  - **In PDF (Invigilator's Duty Summary)**: For a circle of diameter 17mm, the font size must be set to `25pt` and aligned using `{ align: 'center', baseline: 'middle' }` at the circle midpoint (`avatarY + 0.4`).

## 3. "Allotted Duties" Metric Prominence & Equal Spacing
- The number indicating **"Allotted Duties"** (e.g., "6", "8", "12") must look prominent and bold in its designated space:
  - **In PDF Stat Box**: Top label "ALLOTTED DUTIES" is 6.5pt (`statY + 4.6`), bottom label "Sessions Assigned" is 6pt (`statY + 16.8`), while the duty count number is set to **`25pt`** bold placed at the exact center of the box (`statY + 10.0` with `{ align: 'center', baseline: 'middle' }`), leaving equal vertical space between the top title and bottom label.
  - **In UI Metric Box**: The number is displayed doubled in prominence (e.g., `text-6xl font-black`) while keeping the descriptive label clean and compact.
