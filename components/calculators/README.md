# Blog Calculator System

Interactive calculators can be embedded in blog posts to engage readers and provide personalized value.

## Architecture

The calculator system has two modes:

### 1. Native React Components (Recommended)
- Calculators are built as React components in `components/calculators/`
- Embedded in blog posts via HTML comments
- Rendered as interactive React components within the blog post
- Full styling control and seamless integration

### 2. Iframe Mode (Legacy)
- Standalone HTML files in `public/calculators/`
- Embedded via `<iframe>` tags
- Auto-resize via postMessage
- Useful for third-party or legacy calculators

## Available Calculators

| Slug | Component | Description |
|------|-----------|-------------|
| `water-calculator` | `WaterCalculator.jsx` | Daily water intake calculator based on weight, activity, climate |
| `vitamin-d3-calculator` | `VitaminD3Calculator.jsx` | Vitamin D3 supplementation needs estimator |

## How to Embed a Calculator in a Blog Post

### Method 1: Using the Blog Editor (Recommended)

1. Open the blog post in edit mode (`/blog/[slug]/edit`)
2. Place cursor where you want the calculator
3. Click the **🧮 Insert calculator** button in the toolbar
4. Select the calculator from the list
5. An embed comment will be inserted: `<!-- CALCULATOR:water-calculator -->`
6. Save the post

### Method 2: Manual HTML Comment

Add this HTML comment anywhere in the blog post content:

```html
<!-- CALCULATOR:water-calculator -->
```

Replace `water-calculator` with the desired calculator slug.

### Method 3: Using div Tag

```html
<div data-calculator="water-calculator"></div>
```

## How It Works

1. **BlogContent** component parses the HTML content for calculator embed markers
2. Extracts calculator slugs from comments or data attributes
3. Renders the corresponding React component via `BlogCalculatorEmbed`
4. Calculator receives postMessage events for iframe height auto-resizing

## Adding a New Calculator

### Step 1: Create the Calculator Component

Create a new file in `components/calculators/`:

```jsx
'use client'

import { useState, useEffect } from 'react'

export default function MyCalculator() {
  const [result, setResult] = useState(null)

  // Notify parent of height changes (for iframe mode)
  useEffect(() => {
    const notify = () => {
      const h = document.documentElement.scrollHeight
      window.parent.postMessage({ type: 'resize', height: h }, '*')
    }
    setTimeout(notify, 100)
    setTimeout(notify, 500)
    setTimeout(notify, 1000)
    const observer = new MutationObserver(notify)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })
    return () => observer.disconnect()
  }, [result])

  return (
    <div style={{ /* your styles */ }}>
      {/* calculator UI */}
    </div>
  )
}
```

### Step 2: Register the Calculator

Update `components/calculators/index.js`:

```js
import MyCalculator from './MyCalculator'

export const CALCULATORS = {
  // ... existing calculators
  'my-calculator': {
    slug: 'my-calculator',
    name: 'My Calculator',
    component: MyCalculator,
    description: 'Description of what it does',
  },
}
```

### Step 3: Test the Calculator

1. Create or edit a blog post
2. Insert the calculator using the editor button
3. Preview the post and verify the calculator works
4. Check that height auto-resizing works smoothly

## Styling Guidelines

- Use CSS variables for theming: `var(--bg-page)`, `var(--text-1)`, `var(--border)`
- Calculate full width within blog post context
- Ensure mobile responsiveness
- Use gradient backgrounds for visual distinction
- Include helpful tips and disclaimers

## Iframe Mode (Legacy)

For standalone HTML calculators in `/public/calculators/`:

1. Embed via iframe in blog HTML:
```html
<iframe src="/calculators/water-intake-calculator8.html" 
        style="width:100%;border:none;overflow:hidden"
        title="Water Calculator">
</iframe>
```

2. The calculator must send height messages:
```js
window.parent.postMessage({ type: 'resize', height: document.documentElement.scrollHeight }, '*')
```

3. BlogContent automatically resizes iframes on message receive

## Best Practices

1. **Place calculators strategically** - After introducing the topic, before conclusion
2. **Add context** - Explain what the calculator does and why it's useful
3. **Mobile-first** - Ensure calculators work well on small screens
4. **Performance** - Keep calculators lightweight, avoid heavy dependencies
5. **Accessibility** - Use proper form labels, keyboard navigation
6. **Disclaimers** - Include "for informational purposes only" where appropriate

## Troubleshooting

**Calculator not showing:**
- Check that the slug matches exactly (case-sensitive)
- Verify the calculator is registered in `index.js`
- Check browser console for errors

**Calculator height not adjusting:**
- Ensure postMessage is being sent from calculator
- Check that BlogContent is rendering the calculator (not as iframe)
- Verify no CSS overflow:hidden on parent containers

**Styles not applying:**
- Use inline styles or CSS-in-JS (no external stylesheets)
- Reference CSS variables for theme consistency
- Check for specificity conflicts with blog post styles
