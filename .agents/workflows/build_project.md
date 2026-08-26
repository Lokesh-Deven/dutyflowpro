---
name: build_project
description: Step-by-step workflow to install dependencies, typecheck, and build the DutyFlow Next.js project.
---

# Build Project Workflow

Follow these steps to compile and build the DutyFlow application:

## 1. Verify Node.js Environment
Ensure Node.js is version 20 or higher.
```bash
node --version
```

## 2. Install Dependencies
Install all required npm dependencies.
```bash
npm install
```

## 3. Typecheck Code
Run TypeScript static type checking without emitting output files.
```bash
npm run typecheck
```

## 4. Build Production Bundle
Compile the Next.js production build.
```bash
npm run build
```
