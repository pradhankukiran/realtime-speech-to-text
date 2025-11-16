import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { apiKey: userApiKey } = await request.json()

    // Use user-provided API key if available, otherwise fall back to env
    const apiKey = userApiKey || process.env.ELEVENLABS_API_KEY

    if (!apiKey) {
      return Response.json(
        { error: "API key is required. Please provide an API key or configure ELEVENLABS_API_KEY in environment variables." },
        { status: 400 }
      )
    }

    const response = await fetch(
      "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to create token: ${response.statusText}`)
    }

    const data = await response.json()
    return Response.json({ token: data.token })
  } catch (error) {
    console.error("Token creation error:", error)
    return Response.json(
      { error: "Failed to create token" },
      { status: 500 }
    )
  }
}
