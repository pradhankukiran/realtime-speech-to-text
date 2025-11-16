'use client'

import { useState, useEffect, useRef } from 'react'
import { useScribe } from '@elevenlabs/react'
import { Mic, Square, Copy, Trash2, Radio, Volume2, VolumeX } from 'lucide-react'

interface TranscriptSegment {
  id: string
  text: string
  timestamp: number
}

interface Voice {
  voice_id: string
  name: string
  description: string
}

// Popular ElevenLabs voices with different accents
const VOICES: Voice[] = [
  { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', description: 'American Male (Warm, Conversational)' },
  { voice_id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', description: 'British Male (Smooth, Professional)' },
  { voice_id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', description: 'Australian Male (Friendly, Casual)' },
]

export function SpeechToTextRecorder() {
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptSegment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copiedFeedback, setCopiedFeedback] = useState(false)
  const [accumulatedText, setAccumulatedText] = useState<string>('')
  const [token, setToken] = useState<string | null>(null)
  const [isLoadingToken, setIsLoadingToken] = useState(true)
  const [apiKey, setApiKey] = useState<string>('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // TTS-related state
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [selectedVoice, setSelectedVoice] = useState<string>('JBFqnCBsd6RMkjVDRZzb') // Default voice (George)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false)
  const [isApiKeyDropdownOpen, setIsApiKeyDropdownOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioQueueRef = useRef<string[]>([])
  const isPlayingRef = useRef(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const apiKeyDropdownRef = useRef<HTMLDivElement>(null)

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

  // Fetch token when API key changes
  useEffect(() => {
    const fetchToken = async () => {
      try {
        // Clear existing token to force refetch with new API key
        setToken(null)
        setIsLoadingToken(true)
        setError(null)

        const keyToUse = apiKey.trim() || undefined
        console.log('Fetching token...', keyToUse ? 'with user API key' : 'with env API key')

        const tokenResponse = await fetch('/api/scribe-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: keyToUse }),
        })
        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json()
          throw new Error(errorData.error || 'Failed to get authentication token')
        }

        const { token: fetchedToken } = await tokenResponse.json()
        setToken(fetchedToken)
        console.log('Token fetched successfully with', keyToUse ? 'user API key' : 'env API key')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch token'
        console.error('Error:', errorMessage)
        setError(errorMessage)
      } finally {
        setIsLoadingToken(false)
      }
    }

    fetchToken()
  }, [apiKey])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [accumulatedText, scribe.partialTranscript])

  // Close voice dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsVoiceDropdownOpen(false)
      }
    }

    if (isVoiceDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isVoiceDropdownOpen])

  // Close API key dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (apiKeyDropdownRef.current && !apiKeyDropdownRef.current.contains(event.target as Node)) {
        setIsApiKeyDropdownOpen(false)
      }
    }

    if (isApiKeyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isApiKeyDropdownOpen])

  // TTS playback function
  const playTextToSpeech = async (text: string) => {
    if (!ttsEnabled || !text.trim()) {
      console.log('TTS skipped - enabled:', ttsEnabled, 'text:', text.trim())
      setIsProcessing(false)
      return
    }

    try {
      console.log('TTS: Starting playback for text:', text)
      setIsProcessing(false)
      setIsSpeaking(true)

      const keyToUse = apiKey.trim() || undefined
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          voiceId: selectedVoice,
          modelId: 'eleven_flash_v2_5',
          apiKey: keyToUse,
        }),
      })

      console.log('TTS: Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('TTS: API error:', errorText)
        throw new Error(`TTS request failed: ${response.status} - ${errorText}`)
      }

      const audioBlob = await response.blob()
      console.log('TTS: Audio blob received, size:', audioBlob.size)

      const audioUrl = URL.createObjectURL(audioBlob)

      // Create or reuse audio element
      if (!audioRef.current) {
        audioRef.current = new Audio()
        console.log('TTS: Created new audio element')
      }

      audioRef.current.src = audioUrl
      audioRef.current.volume = 1.0 // Ensure volume is at maximum
      audioRef.current.muted = false // Ensure not muted

      audioRef.current.onerror = (e) => {
        console.error('TTS: Audio element error:', e)
        setError('Audio playback failed')
        setIsSpeaking(false)
      }

      audioRef.current.onended = () => {
        console.log('TTS: Playback ended')
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }

      audioRef.current.onplay = () => {
        console.log('TTS: Audio onplay event fired')
      }

      audioRef.current.onloadeddata = () => {
        console.log('TTS: Audio loaded, duration:', audioRef.current?.duration)
      }

      console.log('TTS: Starting audio playback')
      try {
        await audioRef.current.play()
        console.log('TTS: Audio playing, volume:', audioRef.current.volume, 'muted:', audioRef.current.muted)
      } catch (playError) {
        console.error('TTS: Play failed:', playError)
        throw playError
      }
    } catch (err) {
      console.error('TTS playback error:', err)
      setError('TTS Error: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setIsProcessing(false)
      setIsSpeaking(false)
    }
  }

  const handleStart = async () => {
    try {
      setError(null)

      // If no token available, try to fetch one
      let currentToken = token
      if (!currentToken) {
        console.log('No token available, fetching new token...')
        const keyToUse = apiKey.trim() || undefined
        const tokenResponse = await fetch('/api/scribe-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: keyToUse }),
        })
        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json()
          throw new Error(errorData.error || 'Failed to get authentication token')
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
      console.log('handleStop called')
      console.log('TTS enabled:', ttsEnabled)
      console.log('Accumulated text:', accumulatedText)
      console.log('Partial transcript:', scribe.partialTranscript)
      console.log('Transcript history length:', transcriptHistory.length)

      // Capture partial transcript before disconnecting
      const partialText = scribe.partialTranscript || ''

      await scribe.disconnect()

      // Set processing state if TTS is enabled
      if (ttsEnabled) {
        setIsProcessing(true)
      }

      // Small delay to ensure state is updated
      setTimeout(() => {
        // Get text from all sources
        const textFromState = accumulatedText.trim()
        const textFromHistory = transcriptHistory.map((s) => s.text).join(' ').trim()
        const textFromPartial = partialText.trim()

        // Combine accumulated + partial (partial might not be in accumulated yet)
        const fullText = (textFromState + ' ' + textFromPartial).trim()
        const textToSpeak = fullText || textFromHistory

        console.log('Text from state:', textFromState)
        console.log('Text from history:', textFromHistory)
        console.log('Text from partial:', textFromPartial)
        console.log('Final text to speak:', textToSpeak)

        // Play TTS of the full transcript after stopping
        if (ttsEnabled && textToSpeak) {
          console.log('Recording stopped, playing TTS of full transcript')
          playTextToSpeech(textToSpeak)
        } else {
          console.log('TTS not triggered. Enabled:', ttsEnabled, 'Has text:', !!textToSpeak)
        }
      }, 500)
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

  const handleApiKeyPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    // Auto-collapse after paste
    setTimeout(() => {
      setIsApiKeyDropdownOpen(false)
    }, 1000)
  }

  return (
    <div className="w-full min-h-screen">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header Section with API Key Input */}
        <div className="mb-8 sm:mb-12">
          {/* Title */}
          <div className="text-center mb-4">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter text-foreground">
              VOICE<span className="text-primary">SCRIBER</span>
            </h1>
          </div>

          {/* API Key Button & Dropdown */}
          <div className="max-w-2xl mx-auto" ref={apiKeyDropdownRef}>
            <div className="text-center">
              <button
                onClick={() => setIsApiKeyDropdownOpen(!isApiKeyDropdownOpen)}
                className="px-6 py-2 rounded-lg border-2 border-foreground bg-card text-foreground hover:bg-muted transition-all duration-200 text-sm font-bold"
              >
                {apiKey ? '✓ API Key Set' : 'Put ElevenLabs API key here'}
              </button>

              {/* Dropdown Input */}
              {isApiKeyDropdownOpen && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onPaste={handleApiKeyPaste}
                    placeholder="Paste your ElevenLabs API key..."
                    className="w-full px-4 py-3 rounded-lg border-4 border-foreground bg-background text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-lg"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>
        </div>


      {/* Recording Section, Live Transcript, and Speaker Button */}
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-6 mb-6">
        {/* Main Recording Button */}
        <div className="relative flex items-center justify-center py-8 lg:py-12 lg:order-1">
          {/* Main Button */}
          <button
            onClick={scribe.isConnected ? handleStop : handleStart}
            disabled={scribe.isConnecting || isLoadingToken}
            className={`
              relative w-36 h-36 sm:w-44 sm:h-44 rounded-full transition-all duration-300
              flex items-center justify-center group shadow-xl
              ${scribe.isConnected
                ? 'bg-secondary hover:shadow-2xl animate-pulse-shadow'
                : 'bg-primary hover:scale-105 hover:shadow-2xl'}
              ${scribe.isConnecting || isLoadingToken ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {/* Icon */}
            <div className="flex flex-col items-center gap-3">
              {scribe.isConnected ? (
                <>
                  <Square className="w-12 h-12 sm:w-16 sm:h-16 text-white fill-white" />
                  <span className="text-xs sm:text-sm font-black text-white tracking-widest">STOP</span>
                </>
              ) : (
                <>
                  <Mic className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                  <span className="text-xs sm:text-sm font-black text-white tracking-widest">
                    {isLoadingToken ? 'LOADING...' : scribe.isConnecting ? 'CONNECTING' : 'RECORD'}
                  </span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Live Transcript Display */}
        <div className="bg-card border-4 border-foreground rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg flex flex-col h-full lg:min-h-[500px] lg:order-2">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className={`w-3 h-3 rounded-full ${scribe.isConnected ? 'bg-secondary animate-pulse' : isProcessing ? 'bg-primary animate-pulse' : isSpeaking ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
          <span className="text-xs sm:text-sm font-black tracking-wider text-foreground uppercase">
            {scribe.isConnected ? 'Recording' : isProcessing ? 'Processing' : isSpeaking ? 'Speaking' : 'Ready'}
          </span>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 min-h-64 sm:min-h-80 lg:min-h-0 overflow-y-auto font-mono text-base sm:text-lg leading-relaxed custom-scrollbar"
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

        {/* Speaker/TTS Button */}
        <div className="relative flex flex-col items-center justify-center py-8 lg:py-12 lg:order-3 gap-6">
          {/* Speaker Button */}
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            disabled={isSpeaking}
            className={`
              relative w-36 h-36 sm:w-44 sm:h-44 rounded-full transition-all duration-300
              flex items-center justify-center group shadow-xl
              ${ttsEnabled
                ? 'bg-primary hover:shadow-2xl'
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'}
              ${isSpeaking ? 'opacity-50 cursor-not-allowed animate-pulse' : 'cursor-pointer hover:scale-105'}
            `}
          >
            {/* Icon */}
            <div className="flex flex-col items-center gap-3">
              {isSpeaking ? (
                <>
                  <Volume2 className="w-12 h-12 sm:w-16 sm:h-16 text-white animate-pulse" />
                  <span className="text-xs sm:text-sm font-black text-white tracking-widest">PLAYING</span>
                </>
              ) : ttsEnabled ? (
                <>
                  <Volume2 className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                  <span className="text-xs sm:text-sm font-black text-white tracking-widest">TTS ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                  <span className="text-xs sm:text-sm font-black text-white tracking-widest">TTS OFF</span>
                </>
              )}
            </div>
          </button>

          {/* Voice Selector */}
          {ttsEnabled && (
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
                className="px-4 py-2 rounded-lg font-black text-xs sm:text-sm border-2 border-foreground bg-card text-foreground hover:bg-muted cursor-pointer transition-all duration-200 uppercase tracking-wider shadow-lg flex items-center gap-2 whitespace-nowrap"
              >
                <span>{VOICES.find((v) => v.voice_id === selectedVoice)?.name}</span>
                <span className={`text-[10px] transition-transform duration-200 ${isVoiceDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {/* Dropdown Menu */}
              {isVoiceDropdownOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-80 max-w-[calc(100vw-2rem)] bg-card border-4 border-foreground rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[60vh] overflow-y-auto">
                  {VOICES.map((voice) => (
                    <button
                      key={voice.voice_id}
                      onClick={() => {
                        setSelectedVoice(voice.voice_id)
                        setIsVoiceDropdownOpen(false)
                      }}
                      className={`
                        w-full px-5 py-4 text-left font-bold transition-all duration-150 border-b-2 border-foreground/20 last:border-b-0
                        ${selectedVoice === voice.voice_id
                          ? 'bg-primary text-white'
                          : 'bg-card text-foreground hover:bg-muted'}
                      `}
                    >
                      <div className="font-black uppercase tracking-wider text-sm sm:text-base">{voice.name}</div>
                      <div className="text-xs sm:text-sm mt-1 opacity-80 normal-case tracking-normal font-medium">
                        {voice.description}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 justify-center">
        <button
          onClick={copyToClipboard}
          disabled={!accumulatedText.trim()}
          className={`
            px-5 py-3 sm:py-3.5 rounded-lg font-bold text-sm sm:text-base transition-all duration-200 border-2
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
            px-5 py-3 sm:py-3.5 rounded-lg font-bold text-sm sm:text-base transition-all duration-200 border-2
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
    </div>
  )
}
