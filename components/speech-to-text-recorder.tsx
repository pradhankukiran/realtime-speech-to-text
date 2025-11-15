'use client'

import { useState } from 'react'
import { useScribe } from '@elevenlabs/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mic, Square, Copy, Trash2 } from 'lucide-react'

interface TranscriptSegment {
  id: string
  text: string
  timestamp: number
}

export function SpeechToTextRecorder() {
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptSegment[]>([])
  const [error, setError] = useState<string | null>(null)

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    onPartialTranscript: (data) => {
      console.log('[v0] Partial transcript:', data.text)
    },
    onCommittedTranscript: (data) => {
      console.log('[v0] Committed transcript:', data.text)
      if (data.text.trim()) {
        setTranscriptHistory((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            text: data.text,
            timestamp: Date.now(),
          },
        ])
      }
    },
    onError: (error) => {
      console.error('[v0] Scribe error:', error)
      setError('Transcription error: ' + (error instanceof Error ? error.message : 'Unknown error'))
    },
  })

  const handleStart = async () => {
    try {
      setError(null)
      console.log('[v0] Fetching token...')

      const tokenResponse = await fetch('/api/scribe-token')
      if (!tokenResponse.ok) {
        throw new Error('Failed to get authentication token')
      }

      const { token } = await tokenResponse.json()
      console.log('[v0] Token received, connecting...')

      await scribe.connect({
        token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording'
      console.error('[v0] Error:', errorMessage)
      setError(errorMessage)
    }
  }

  const handleStop = async () => {
    try {
      await scribe.disconnect()
    } catch (err) {
      console.error('[v0] Error stopping:', err)
    }
  }

  const copyToClipboard = () => {
    const allText = transcriptHistory.map((s) => s.text).join(' ')
    navigator.clipboard.writeText(allText)
  }

  const clearHistory = () => {
    setTranscriptHistory([])
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-3xl">Real-Time Transcription</CardTitle>
          <CardDescription>Powered by ElevenLabs Scribe v2</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Live Transcript Display */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Live Transcript</label>
            <div className="min-h-24 p-4 bg-secondary/50 rounded-lg border border-border">
              {scribe.partialTranscript ? (
                <p className="text-foreground animate-pulse">{scribe.partialTranscript}</p>
              ) : (
                <p className="text-muted-foreground italic">Awaiting input...</p>
              )}
            </div>
          </div>

          {/* Recording Controls */}
          <div className="flex gap-3">
            <Button
              onClick={handleStart}
              disabled={scribe.isConnecting || scribe.isConnected}
              size="lg"
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <Mic className="w-4 h-4 mr-2" />
              {scribe.isConnecting ? 'Connecting...' : scribe.isConnected ? 'Recording...' : 'Start Recording'}
            </Button>

            <Button
              onClick={handleStop}
              disabled={!scribe.isConnected}
              size="lg"
              variant="destructive"
              className="flex-1"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Recording
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm border border-destructive/20">
              {error}
            </div>
          )}

          {/* Transcript History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">Transcript History</label>
              <div className="flex gap-2">
                <Button
                  onClick={copyToClipboard}
                  disabled={transcriptHistory.length === 0}
                  size="sm"
                  variant="outline"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy All
                </Button>
                <Button
                  onClick={clearHistory}
                  disabled={transcriptHistory.length === 0}
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 p-3 bg-secondary/30 rounded-lg border border-border">
              {transcriptHistory.length > 0 ? (
                transcriptHistory.map((segment) => (
                  <div key={segment.id} className="p-2 bg-background rounded border border-border/50">
                    <p className="text-sm text-foreground">{segment.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(segment.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                  No transcripts yet
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
