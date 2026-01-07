# Supabase Functions

This directory contains Supabase Edge Functions (Deno runtime).

## Available Functions

### disease-scan
AI-powered disease detection for fish images.

**Documentation**: [disease-scan/README.md](./disease-scan/README.md)

**Deploy**:
```bash
supabase functions deploy disease-scan
```

**Set secrets**:
```bash
supabase secrets set AI_API_KEY=sk-proj-...
```

**Test locally**:
```bash
supabase functions serve disease-scan
```

## Requirements

- Supabase CLI: `npm install -g supabase`
- Deno (auto-installed by Supabase CLI)

## TypeScript Errors

TypeScript errors shown in VS Code for Deno files are expected and can be ignored. The functions use Deno's runtime and will compile correctly when deployed.

To suppress these locally, the workspace uses `deno.json` configuration.
