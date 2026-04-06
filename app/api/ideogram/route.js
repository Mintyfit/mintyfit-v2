import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(request) {
  const body = await request.json()

  const apiKey = process.env.IDEOGRAM_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'IDEOGRAM_API_KEY is not configured' }, { status: 500 })
  }

  const response = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': apiKey,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}
