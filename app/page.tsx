import { SpeechToTextRecorder } from '@/components/speech-to-text-recorder'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-secondary/10 flex items-center justify-center p-4">
      <SpeechToTextRecorder />
    </main>
  )
}
