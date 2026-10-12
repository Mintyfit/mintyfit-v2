import { splitInstructionSentences } from '@/lib/recipe/instructionSteps'

// Renders a step's instruction text. Multi-sentence paragraphs are broken
// into a numbered list of one-sentence sub-steps (easier to follow while
// cooking, and each sub-step can be referenced by number); single-sentence
// instructions render as a plain paragraph.
export default function InstructionText({ text, fontSize = '0.9375rem' }) {
  const sentences = splitInstructionSentences(text)

  if (sentences.length <= 1) {
    return (
      <p style={{ fontSize, color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 0.375rem' }}>{text}</p>
    )
  }

  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 0.375rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      {sentences.map((s, i) => (
        <li key={i} style={{ display: 'flex', gap: '0.5rem', fontSize, color: 'var(--text-2)', lineHeight: 1.55 }}>
          <span aria-hidden="true" style={{ flexShrink: 0, minWidth: '1.2em', fontWeight: 600, color: 'var(--text-3)' }}>
            {i + 1}.
          </span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  )
}
