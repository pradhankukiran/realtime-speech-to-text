'use client'

import { useState, useEffect, useRef } from 'react'
import { useScribe } from '@elevenlabs/react'
import { Mic, Square, Copy, Trash2, Radio } from 'lucide-react'

interface TranscriptSegment {
  id: string
  text: string
  timestamp: number
}

export function SpeechToTextRecorder() {
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptSegment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copiedFeedback, setCopiedFeedback] = useState(false)
  const [accumulatedText, setAccumulatedText] = useState<string>('')
  const [token, setToken] = useState<string | null>(null)
  const [isLoadingToken, setIsLoadingToken] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    onPartialTranscript: (data) => {
      console.log('Partial transcript:', data.text)
    },
    onCommittedTranscript: (data) => {
      console.log('Committed transcript:', data.text)
      if (data.text.trim()) {
        setAccumulatedText((prev) => prev + ' ' + data.text)
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
      console.error('Scribe error:', error)
      setError('Transcription error: ' + (error instanceof Error ? error.message : 'Unknown error'))
    },
  })

  // Fetch token on component mount
  useEffect(() => {
    const fetchToken = async () => {
      try {
        setIsLoadingToken(true)
        setError(null)
        console.log('Fetching token on page load...')

        const tokenResponse = await fetch('/api/scribe-token')
        if (!tokenResponse.ok) {
          throw new Error('Failed to get authentication token')
        }

        const { token: fetchedToken } = await tokenResponse.json()
        setToken(fetchedToken)
        console.log('Token fetched successfully')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch token'
        console.error('Error:', errorMessage)
        setError(errorMessage + ' - Please check your ELEVENLABS_API_KEY in .env.local')
      } finally {
        setIsLoadingToken(false)
      }
    }

    fetchToken()
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [accumulatedText, scribe.partialTranscript])

  const handleStart = async () => {
    try {
      setError(null)

      // If no token available, try to fetch one
      let currentToken = token
      if (!currentToken) {
        console.log('No token available, fetching new token...')
        const tokenResponse = await fetch('/api/scribe-token')
        if (!tokenResponse.ok) {
          throw new Error('Failed to get authentication token')
        }
        const { token: fetchedToken } = await tokenResponse.json()
        currentToken = fetchedToken
        setToken(currentToken)
      }

      console.log('Connecting with token...')
      await scribe.connect({
        token: currentToken,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording'
      console.error('Error:', errorMessage)
      setError(errorMessage)
    }
  }

  const handleStop = async () => {
    try {
      await scribe.disconnect()
    } catch (err) {
      console.error('Error stopping:', err)
    }
  }

  const copyToClipboard = () => {
    const fullText = accumulatedText.trim() || transcriptHistory.map((s) => s.text).join(' ')
    navigator.clipboard.writeText(fullText)
    setCopiedFeedback(true)
    setTimeout(() => setCopiedFeedback(false), 2000)
  }

  const clearHistory = () => {
    setTranscriptHistory([])
    setAccumulatedText('')
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header Section */}
      <div className="mb-8 sm:mb-12 text-center">
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-3 sm:mb-4 text-foreground">
          VOICE<span className="text-primary">SCRIBER</span>
        </h1>
      </div>

      {/* Main Recording Button */}
      <div className="relative flex items-center justify-center py-8 sm:py-12 mb-8">
        {/* Ripple effect when recording */}
        {scribe.isConnected && (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full border-4 border-secondary animate-ripple" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center" style={{ animationDelay: '0.5s' }}>
              <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full border-4 border-primary animate-ripple" />
            </div>
          </>
        )}

        {/* Main Button */}
        <button
          onClick={scribe.isConnected ? handleStop : handleStart}
          disabled={scribe.isConnecting || isLoadingToken}
          className={`
            relative w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56 rounded-full transition-all duration-300
            flex items-center justify-center group shadow-xl
            ${scribe.isConnected
              ? 'bg-secondary hover:shadow-2xl animate-pulse-shadow'
              : 'bg-primary hover:scale-105 hover:shadow-2xl'}
            ${scribe.isConnecting || isLoadingToken ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {/* Icon */}
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            {scribe.isConnected ? (
              <>
                <Square className="w-16 h-16 sm:w-20 sm:h-20 text-white fill-white" />
                <span className="text-sm sm:text-base font-black text-white tracking-widest">STOP</span>
              </>
            ) : (
              <>
                <Mic className="w-16 h-16 sm:w-20 sm:h-20 text-white" />
                <span className="text-sm sm:text-base font-black text-white tracking-widest">
                  {isLoadingToken ? 'LOADING...' : scribe.isConnecting ? 'CONNECTING' : 'RECORD'}
                </span>
              </>
            )}
          </div>
        </button>
      </div>

      {/* Live Transcript Display */}
      <div className="bg-card border-4 border-foreground rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg mb-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className={`w-3 h-3 rounded-full ${scribe.isConnected ? 'bg-secondary animate-pulse' : 'bg-muted-foreground'}`} />
          <span className="text-xs sm:text-sm font-black tracking-wider text-foreground uppercase">
            {scribe.isConnected ? 'Recording' : 'Ready'}
          </span>
        </div>

        <div
          ref={scrollRef}
          className="min-h-32 sm:min-h-40 max-h-[400px] sm:max-h-[500px] overflow-y-auto font-mono text-base sm:text-lg leading-relaxed custom-scrollbar"
        >
          {(scribe.isConnected || accumulatedText.trim()) ? (
            <p className="text-foreground font-medium whitespace-pre-wrap">
              {accumulatedText}
              {scribe.partialTranscript && (
                <span className="text-foreground/70"> {scribe.partialTranscript}</span>
              )}
            </p>
          ) : (
            <p className="text-muted-foreground italic text-sm sm:text-base">Awaiting audio input...</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        <button
          onClick={copyToClipboard}
          disabled={!accumulatedText.trim()}
          className={`
            flex-1 px-5 py-3 sm:py-3.5 rounded-lg font-bold text-sm sm:text-base transition-all duration-200 border-2
            ${!accumulatedText.trim()
              ? 'bg-muted border-muted text-muted-foreground cursor-not-allowed'
              : copiedFeedback
                ? 'bg-primary border-primary text-white'
                : 'bg-card border-foreground text-foreground hover:bg-foreground hover:text-background'}
          `}
        >
          <div className="flex items-center justify-center gap-2">
            <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{copiedFeedback ? 'Copied!' : 'Copy Transcript'}</span>
          </div>
        </button>
        <button
          onClick={clearHistory}
          disabled={!accumulatedText.trim()}
          className={`
            flex-1 px-5 py-3 sm:py-3.5 rounded-lg font-bold text-sm sm:text-base transition-all duration-200 border-2
            ${!accumulatedText.trim()
              ? 'bg-muted border-muted text-muted-foreground cursor-not-allowed'
              : 'bg-card border-destructive text-destructive hover:bg-destructive hover:text-white'}
          `}
        >
          <div className="flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Clear Transcript</span>
          </div>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border-2 border-destructive rounded-xl p-4 sm:p-6 animate-slide-up">
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-full bg-destructive mt-1 animate-pulse flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-destructive mb-1">Error</p>
              <p className="text-xs sm:text-sm text-foreground break-words">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: oklch(0.88 0 0);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: oklch(0.7 0 0);
        }
      `}</style>
    </div>
  )
}
