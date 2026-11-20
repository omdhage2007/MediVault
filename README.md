# MediVault — Personal Medical Record & Prescription Management Platform

**Tagline:** Your Health. Your History. Your Control.

MediVault lets patients securely upload prescriptions and lab reports, extract
information with OCR, organise records chronologically, search past records, and
share selected records with doctors through secure links and QR codes.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
npm run preview    # preview the production build
npm run lint       # tsc --noEmit
```

## Demo login

| Email | Password |
| --- | --- |
| `odhage3@gmail.com` | `Demo1234` |

The scaffold ships with 8 sample records (prescriptions, CBC and vitamin
panels, X-ray, MRI, dental and annual checkup). Demo auth is browser-local;
new demo accounts use a local password hash, while the Supabase service layer
in `src/services/` is the real deployment path.

## Design system (final, locked)

| Token | Value |
| --- | --- |
| Background | Slate Blue `#4A6FA5` |
| Base | Light Gray `#D3D3D3` |
| Cards / panels / sidebar | White `#FFFFFF` |
| Primary | Teal `#008080` (hover `#006666`) |
| Accent | Soft Gray `#E0E0E0` |
| Text | Charcoal `#1A2E2E` |
| Secondary text | `#5A6B6B` |
| Tint | `#E6F2F2` |

Dark mode: background `#22374E`, cards `#2E4A66`, text bone `#F2EFE8`,
secondary `#B8C4D0`, primary brighter teal `#2AA5A5`. The dark/light toggle
lives at the top right of the header and top bar on every screen and persists
via a safe storage helper (try/catch + in-memory fallback).

Typography: **Inter** for interface text, **Space Grotesk** for headings.

## Supabase setup (real deployment)

1. Create a project at https://supabase.com/dashboard.
2. Copy `.env.example` to `.env.local` and set
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or the legacy
   `VITE_SUPABASE_ANON_KEY`).
3. Apply `supabase/migrations/20261120120000_medivault_schema.sql` to the
   project using the Supabase CLI or SQL editor. The migration is additive and
   configures the tables, triggers, RLS policies, private medical-document
   storage bucket, public avatar bucket, and signup profile trigger used by the
   application. Do not use an older schema copied from this README.
4. Deploy the three Edge Functions in `supabase/functions/` and keep the
   service-role key in Supabase's server-side function environment only.
5. OCR runs locally in the browser with Tesseract.js and pdf.js. It produces
   editable suggestions marked unverified until the user reviews them.

## Project structure

```
src/
  main.tsx            App entry
  App.tsx             Hash routing, theme state, toasts, app shell
  index.css           Tailwind + design tokens (CSS variables)
  lib/utils.ts        cn() + safe storage helper
  types/index.ts      MedicalRecord, ExtractedData, ShareLink, Profile
  data/sampleData.ts  8 sample records + demo profile
  services/           supabase.ts, auth.ts, records.ts, storage.ts,
                      ocrEngine.ts, cloudSharing.ts, shareResolver.ts
  components/
    ui/               grid-feature-cards.tsx, meadow-rise-footer.tsx
    layout/           Sidebar.tsx, Navbar.tsx (theme toggle)
    dashboard/        StatsCard.tsx, RecentRecords.tsx, ActivityTimeline.tsx
    records/          RecordCard.tsx, RecordFilters.tsx, DocumentViewer.tsx
  pages/              Landing, Login, Signup, Dashboard, MedicalRecords,
                      UploadDocuments, DocumentPreview, MedicalHistory,
                      SharedRecords, Settings
```

## Notes

- Google sign-in is enabled only when `VITE_ENABLE_GOOGLE_AUTH=true` and the
  Google provider is configured in Supabase. In local demo mode it is a
  clearly labelled client-side demonstration.
- The Meadow Rise Footer component was supplied by the user and is copied
  verbatim (its `"\n"` string-literal escapes were restored so it compiles
  under strict TypeScript; a `@ts-nocheck` header is kept for its canvas
  math). It is configured with MediVault props and a light/dark palette
  override — never its default meadow preset.
- The Grid Feature Cards component is also supplied verbatim, with the six
  MediVault features (Smart Document Storage, Intelligent OCR, Medical
  Timeline, Secure Sharing, Smart Search, Complete Control).
