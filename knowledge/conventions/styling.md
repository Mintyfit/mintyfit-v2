# Styling Conventions

## Current Approach
- **Tailwind CSS 4** utility classes — primary styling method
- CSS custom properties for theming in `app/globals.css`:
  - Backgrounds: `--bg-page`, `--bg-card`, `--bg-nav`
  - Text: `--text-1` through `--text-4`
  - Borders: `--border`
- Dark mode: `.dark` class on `<html>`, toggled via ThemeContext, persisted to localStorage

## Color Palette
- Primary green: `#3D8A3E` (buttons, active states, brand)
- Accent purple: `#7C3AED` (calendar slots, premium features)
- Font: Montserrat (loaded via Next.js `localFont` in `app/layout.jsx`)

## Responsive Strategy
- Mobile: bottom navigation bar
- Desktop: top navigation bar
- Mobile-first breakpoints via Tailwind (`sm:`, `md:`, `lg:`)

## Component Styling Rules
- Use Tailwind utility classes directly — no CSS modules for new components
- CSS custom properties (`var(--bg-card)`) for colors that change with dark mode
- Avoid inline styles except for truly dynamic values (e.g., widths from JS calculations)
- Prefer `gap-*` over `margin` for spacing between flex/grid children

## Dark Mode
```jsx
// Correct — uses CSS custom properties, auto-responds to .dark class
<div className="bg-[var(--bg-card)] text-[var(--text-1)]">

// Avoid — hardcoded colors that don't respond to dark mode
<div className="bg-white text-gray-900">
```

---
*Last updated: 2026-04-06*
