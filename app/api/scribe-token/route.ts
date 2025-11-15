export async function GET() {
  try {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to create token: ${response.statusText}`)
    }

    const data = await response.json()
    return Response.json({ token: data.token })
  } catch (error) {
    console.error("[v0] Token creation error:", error)
    return Response.json(
      { error: "Failed to create token" },
      { status: 500 }
    )
  }
}
