import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, Phone, Video, Heart, Wind, Zap, Baby, Droplets, Activity } from 'lucide-react'
import { emergencyService } from '@/services'
import { Card } from '@/components/ui'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

const EMERGENCY_TYPES = [
  { value: 'chest_pain', label: 'Chest Pain', icon: Heart, color: 'text-red-600 bg-red-50' },
  { value: 'breathing', label: 'Difficulty Breathing', icon: Wind, color: 'text-red-600 bg-red-50' },
  { value: 'stroke', label: 'Stroke Symptoms', icon: Zap, color: 'text-red-600 bg-red-50' },
  { value: 'childbirth', label: 'Childbirth Emergency', icon: Baby, color: 'text-pink-600 bg-pink-50' },
  { value: 'severe_bleeding', label: 'Severe Bleeding', icon: Droplets, color: 'text-red-600 bg-red-50' },
  { value: 'unconscious', label: 'Unconscious Person', icon: Activity, color: 'text-orange-600 bg-orange-50' },
  { value: 'severe_injury', label: 'Severe Injury', icon: AlertTriangle, color: 'text-orange-600 bg-orange-50' },
  { value: 'other', label: 'Other Emergency', icon: AlertTriangle, color: 'text-gray-600 bg-gray-50' },
]

export default function EmergencyPage() {
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState(null)

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => emergencyService.create(data),
    onSuccess: ({ data }) => {
      setResult(data)
      toast.success('Emergency request submitted!')
    },
    onError: () => toast.error('Failed to submit emergency request'),
  })

  const handleSubmit = () => {
    if (!selected) return toast.error('Please select emergency type')
    mutate({ emergency_type: selected })
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div className="bg-red-600 text-white rounded-2xl p-6 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3" />
          <h2 className="text-xl font-bold">Emergency Request Submitted</h2>
          <p className="text-red-100 mt-2 text-sm">{result.emergency_services_reminder}</p>
        </div>

        {result.special_notice && (
          <Card className="border-pink-200 bg-pink-50">
            <p className="text-sm text-pink-800">{result.special_notice}</p>
          </Card>
        )}

        {result.doctor_assigned ? (
          <Card className="border-emerald-200 bg-emerald-50">
            <p className="font-semibold text-emerald-900">✅ Doctor Assigned</p>
            <p className="text-sm text-emerald-700 mt-1">{result.doctor_name} is ready for your consultation</p>
            <Link
              to={`/patient/video/${result.appointment_id}`}
              className="mt-3 flex items-center justify-center gap-2 bg-emerald-600 text-white font-medium py-3 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Video className="w-5 h-5" /> Join Emergency Video Call
            </Link>
          </Card>
        ) : (
          <Card className="border-red-200 bg-red-50">
            <p className="font-semibold text-red-900">⚠️ No Doctors Available</p>
            <p className="text-sm text-red-700 mt-1">{result.message}</p>
            <a href="tel:911" className="mt-3 flex items-center justify-center gap-2 bg-red-600 text-white font-medium py-3 rounded-lg hover:bg-red-700 transition-colors">
              <Phone className="w-5 h-5" /> Call Emergency Services
            </a>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="bg-red-600 text-white rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-8 h-8" />
          <h1 className="text-xl font-bold">Emergency Assistance</h1>
        </div>
        <p className="text-red-100 text-sm">
          For life-threatening emergencies, call <strong>911/999/112</strong> immediately.
          This service connects you to available emergency-duty doctors via priority video consultation.
        </p>
      </div>

      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Select Emergency Type</h2>
        <div className="grid grid-cols-2 gap-3">
          {EMERGENCY_TYPES.map(({ value, label, icon: Icon, color }) => (
            <button
              key={value}
              onClick={() => setSelected(value)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selected === value ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white hover:border-red-200'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-gray-900">{label}</p>
            </button>
          ))}
        </div>
      </div>

      <Button
        variant="emergency"
        size="lg"
        className="w-full"
        onClick={handleSubmit}
        loading={isPending}
        disabled={!selected}
      >
        <AlertTriangle className="w-5 h-5" />
        Request Emergency Consultation
      </Button>

      <p className="text-center text-xs text-gray-400">
        MediAI does not replace emergency services. Always call 911/999/112 for life-threatening situations.
      </p>
    </div>
  )
}
