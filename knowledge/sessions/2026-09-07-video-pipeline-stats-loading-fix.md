# Session — Statistics SWR cache + Loading fix, narrated video pipeline ready

## Goal
Replace landing-page phone screenshots with narrated portrait videos; fix the app-wide "Loading..." flash on repeat visits.

## What happened
1. Seed/demo account `claus.demo@mintyfit.example` created via Admin API (family: Isabel/Helena/Lisa managed + Claus, 21 calendar entries, 60-day journal) to enable authentic recordings.
2. Found & fixed real bug: `profiles` has **no `name` column**, but several pages selected it → PostgREST 400 → linked members silently dropped (statistics, menus/apply, nutritionist-invite).
3. Built narrated video pipeline (Playwright portrait recording + OpenAI TTS (nova) + ffmpeg mux) producing 6 MP4s under `public/landing/video/`. **Paused for user review — NOT integrated into LandingClient.**
4. **Loading fix (real users):** `app/loading.jsx` route fallback was re-running heavy SSR on every visit. Moved statistics' 60-day history (calendar + journals) from server into `useCachedData` SWR (90s TTL). Removed dead `weight_logs` fetch. Second visits now render instantly from localStorage; `EstimatedMemberBanner` still SSR'd with light members-only data.

## Files changed
- `app/statistics/page.jsx` — members-only SSR (`profiles.name` select fixed too)
- `components/statistics/StatisticsClient.jsx` — useStatsHistory via useCachedData
- `app/api/menus/apply/route.js`, `app/nutritionist-invite/[token]/page.jsx`, `components/nutritionist/NutritionistInviteClient.jsx` — profiles.name bug fixes
- `public/landing/video/*.mp4 + *-poster.jpg` (6 narrated videos, review pending)
- Temp recording pipeline in `%TEMP%/opencode/minty-record/`

## Notes for future
- When integrating videos: LandingClient gets FeatureVideo (IntersectionObserver play/pause + tap toggle, <video muted playsInline>, poster fallback).
- Never run `npm run build` while dev server is live (corrupts `.next` chunks — mine + twice this session).
- Trim-script exists but cuts on keyframes; re-record with deterministic waits instead.
