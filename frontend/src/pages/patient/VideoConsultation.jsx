import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Video, Mic, MicOff, VideoOff, Phone } from 'lucide-react'
import { appointmentService } from '@/services'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui'

export default function VideoConsultation() {
  const { appointmentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const jitsiRef = useRef(null)
  const apiRef = useRef(null)
  const [jitsiLoaded, setJitsiLoaded] = useState(false)

  const { data: jitsiData, isLoading } = useQuery({
    queryKey: ['jitsi', appointmentId],
    queryFn: () => appointmentService.getJitsiToken(appointmentId).then((r) => r.data),
  })

  useEffect(() => {
    if (!jitsiData || !jitsiRef.current) return

    const script = document.createElement('script')
    script.src = 'https://meet.jit.si/external_api.js'
    script.async = true
    script.onload = () => {
      const api = new window.JitsiMeetExternalAPI(jitsiData.domain, {
        roomName: jitsiData.room_name,
        parentNode: jitsiRef.current,
        userInfo: {
          displayName: jitsiData.user_info.displayName,
          email: jitsiData.user_info.email,
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          prejoinPageEnabled: false,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: ['microphone', 'camera', 'chat', 'raisehand', 'tileview', 'hangup'],
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
        },
      })
      apiRef.current = api
      setJitsiLoaded(true)
      api.addEventListener('readyToClose', () => navigate(-1))
    }
    document.head.appendChild(script)

    return () => {
      if (apiRef.current) apiRef.current.dispose()
    }
  }, [jitsiData])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Spinner size="lg" />
          <p className="text-gray-600">Preparing your consultation room...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-white font-medium text-sm">Live Consultation</span>
        </div>
        <div className="ml-auto">
          <span className="text-gray-400 text-xs">Room: {jitsiData?.room_name}</span>
        </div>
      </div>

      {/* Jitsi Container */}
      <div className="flex-1 relative">
        {!jitsiLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center space-y-3">
              <Video className="w-12 h-12 text-gray-600 mx-auto" />
              <Spinner size="lg" />
              <p className="text-gray-400">Loading video consultation...</p>
            </div>
          </div>
        )}
        <div ref={jitsiRef} className="w-full h-full" />
      </div>

      {/* Disclaimer */}
      <div className="bg-gray-800 px-4 py-2 text-center">
        <p className="text-gray-500 text-xs">
          This consultation is for informational purposes only and does not constitute a medical diagnosis.
        </p>
      </div>
    </div>
  )
}
