import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Video, AlertTriangle, RefreshCw } from 'lucide-react'
import { appointmentService } from '@/services'
import { Spinner } from '@/components/ui'

export default function VideoConsultation() {
  const { appointmentId } = useParams()
  const navigate = useNavigate()
  const jitsiRef = useRef(null)
  const apiRef = useRef(null)
  const [jitsiLoaded, setJitsiLoaded] = useState(false)
  const [jitsiError, setJitsiError] = useState(null)

  const { data: jitsiData, isLoading, error, refetch } = useQuery({
    queryKey: ['jitsi', appointmentId],
    queryFn: () => appointmentService.getJitsiToken(appointmentId).then(r => r.data),
    retry: 1,
  })

  useEffect(() => {
    if (!jitsiData || !jitsiRef.current) return

    // Remove any existing Jitsi instance
    if (apiRef.current) {
      apiRef.current.dispose()
      apiRef.current = null
    }

    const initJitsi = () => {
      try {
        const api = new window.JitsiMeetExternalAPI(jitsiData.domain || 'meet.jit.si', {
          roomName: jitsiData.room_name,
          parentNode: jitsiRef.current,
          width: '100%',
          height: '100%',
          userInfo: {
            displayName: jitsiData.user_info?.displayName || 'User',
            email: jitsiData.user_info?.email || '',
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            enableWelcomePage: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: ['microphone', 'camera', 'chat', 'raisehand', 'tileview', 'hangup', 'fullscreen'],
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false,
            DEFAULT_BACKGROUND: '#1a1a2e',
          },
        })
        apiRef.current = api
        setJitsiLoaded(true)
        api.addEventListener('readyToClose', () => navigate(-1))
        api.addEventListener('videoConferenceLeft', () => navigate(-1))
      } catch (err) {
        setJitsiError('Failed to start video call. Please try again.')
      }
    }

    // Load Jitsi script if not already loaded
    if (window.JitsiMeetExternalAPI) {
      initJitsi()
    } else {
      // Remove any existing script to avoid duplicates
      const existing = document.getElementById('jitsi-script')
      if (existing) existing.remove()

      const script = document.createElement('script')
      script.id = 'jitsi-script'
      script.src = 'https://meet.jit.si/external_api.js'
      script.async = true
      script.onload = initJitsi
      script.onerror = () => setJitsiError('Failed to load video call library. Check your internet connection.')
      document.head.appendChild(script)
    }

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose()
        apiRef.current = null
      }
    }
  }, [jitsiData])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-primary-500/30">
            <Video className="w-8 h-8 text-white" />
          </div>
          <Spinner size="lg" />
          <p className="text-gray-400">Preparing your consultation room...</p>
        </div>
      </div>
    )
  }

  if (error || jitsiError) {
    const msg = jitsiError || (error?.response?.data?.error) || 'Unable to join the consultation.'
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-red-900 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-white font-bold text-lg">Cannot Join Call</h2>
          <p className="text-gray-400 text-sm">{msg}</p>
          <p className="text-gray-500 text-xs">Make sure the appointment is confirmed and it's the scheduled time.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setJitsiError(null); refetch() }}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-white font-medium text-sm">Live Consultation</span>
        </div>
        {jitsiData?.room_name && (
          <span className="ml-auto text-gray-500 text-xs hidden sm:block">
            Room: {jitsiData.room_name}
          </span>
        )}
      </div>

      {/* Jitsi Container */}
      <div className="flex-1 relative overflow-hidden">
        {!jitsiLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950 z-10">
            <div className="text-center space-y-3">
              <Video className="w-12 h-12 text-gray-700 mx-auto" />
              <Spinner size="lg" />
              <p className="text-gray-500 text-sm">Connecting to video call...</p>
            </div>
          </div>
        )}
        <div ref={jitsiRef} className="w-full h-full" />
      </div>

      {/* Footer disclaimer */}
      <div className="bg-gray-900 border-t border-gray-800 px-4 py-2 flex-shrink-0">
        <p className="text-gray-600 text-xs text-center">
          This consultation is for informational purposes only and does not constitute a medical diagnosis.
        </p>
      </div>
    </div>
  )
}
