import { ElevenLabsClient } from 'elevenlabs'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId, modelId, apiKey: userApiKey } = await request.json()

    if (!text) {
      return new Response('Text is required', { status: 400 })
    }

    // Use user-provided API key if available, otherwise fall back to env
    const apiKey = userApiKey || process.env.ELEVENLABS_API_KEY

    if (!apiKey) {
      return new Response('API key is required. Please provide an API key or configure ELEVENLABS_API_KEY in environment variables.', { status: 400 })
    }

    const client = new ElevenLabsClient({ apiKey })

    // Use streaming TTS for low latency
    const audioStream = await client.textToSpeech.convertAsStream(voiceId || 'JBFqnCBsd6RMkjVDRZzb', {
      text,
      model_id: modelId || 'eleven_flash_v2_5', // Default to Flash v2.5 for low latency (~75ms)
      output_format: 'mp3_44100_128',
    })

    // Convert the async iterable to a ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of audioStream) {
            controller.enqueue(chunk)
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('TTS error:', error)
    return new Response('Failed to generate speech', { status: 500 })
  }
}
