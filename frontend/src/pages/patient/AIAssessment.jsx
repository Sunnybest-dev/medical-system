import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Brain, ChevronRight, AlertTriangle, CheckCircle, Stethoscope, ArrowLeft, History } from 'lucide-react'
import { aiService } from '@/services'
import { Card, Badge, MedicalDisclaimer, Spinner } from '@/components/ui'
import Button from '@/components/ui/Button'
import { Textarea } from '@/components/ui/FormFields'
import { severityConfig } from '@/utils'
import toast from 'react-hot-toast'

const STEPS = ['Select Symptoms', 'Follow-up Questions', 'Assessment Result']

export default function AIAssessment() {
  const [step, setStep] = useState(0)
  const [selectedSymptoms, setSelectedSymptoms] = useState([])
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)

  const { data: symptomsData, isLoading } = useQuery({
    queryKey: ['symptoms'],
    queryFn: () => aiService.getSymptoms().then((r) => r.data.results || r.data),
  })

  const followupMutation = useMutation({
    mutationFn: (symptoms) => aiService.getFollowupQuestions(symptoms),
    onSuccess: ({ data }) => {
      setQuestions(data.questions)
      setStep(1)
    },
    onError: () => toast.error('Failed to get follow-up questions'),
  })

  const assessMutation = useMutation({
    mutationFn: (data) => aiService.performAssessment(data),
    onSuccess: ({ data }) => {
      setResult(data.result)
      setStep(2)
    },
    onError: () => toast.error('Assessment failed. Please try again.'),
  })

  const toggleSymptom = (id) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const handleStep1Next = () => {
    if (selectedSymptoms.length === 0) return toast.error('Please select at least one symptom')
    const names = symptomsData?.filter((s) => selectedSymptoms.includes(s.id)).map((s) => s.name)
    followupMutation.mutate(names)
  }

  const handleStep2Next = () => {
    const followupAnswers = {}
    questions.forEach((q, i) => { followupAnswers[q] = answers[i] || 'Not specified' })
    assessMutation.mutate({
      symptom_ids: selectedSymptoms,
      followup_answers: followupAnswers,
    })
  }

  const reset = () => {
    setStep(0); setSelectedSymptoms([]); setQuestions([]); setAnswers({}); setResult(null)
  }

  const severity = result ? severityConfig[result.severity_level] : null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary-600" /> AI Health Assessment
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Powered by Gemini AI</p>
        </div>
        <Link to="/patient/assess/history" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
          <History className="w-4 h-4" /> History
        </Link>
      </div>

      <MedicalDisclaimer />

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-primary-600' : 'text-gray-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 0: Select Symptoms */}
      {step === 0 && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Select Your Symptoms</h2>
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(symptomsData || []).map((symptom) => (
                <button
                  key={symptom.id}
                  onClick={() => toggleSymptom(symptom.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all text-left ${
                    selectedSymptoms.includes(symptom.id)
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-primary-200'
                  } ${symptom.is_emergency ? 'border-red-200 bg-red-50 text-red-700' : ''}`}
                >
                  {symptom.is_emergency && '⚠️ '}{symptom.name}
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">{selectedSymptoms.length} symptom(s) selected</p>
            <Button onClick={handleStep1Next} loading={followupMutation.isPending} disabled={selectedSymptoms.length === 0}>
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 1: Follow-up Questions */}
      {step === 1 && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Follow-up Questions</h2>
          <p className="text-sm text-gray-500 mb-4">Please answer these questions to help the AI provide a better assessment.</p>
          <div className="space-y-4">
            {questions.map((q, i) => (
              <Textarea
                key={i}
                label={q}
                rows={2}
                placeholder="Your answer..."
                value={answers[i] || ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
              />
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <Button variant="secondary" onClick={() => setStep(0)}>
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button onClick={handleStep2Next} loading={assessMutation.isPending} className="flex-1">
              Get Assessment <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Results */}
      {step === 2 && result && (
        <div className="space-y-4">
          {/* Severity Banner */}
          {result.severity_level === 'red' && (
            <div className="bg-red-600 text-white rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-lg">⚠️ EMERGENCY ALERT</p>
                <p className="text-red-100 text-sm mt-1">Your symptoms may require immediate medical attention. Please call emergency services (911/999/112) or visit the nearest emergency room immediately.</p>
                <Link to="/patient/emergency" className="mt-2 inline-block bg-white text-red-600 font-medium text-sm px-4 py-2 rounded-lg hover:bg-red-50">
                  Request Emergency Consultation
                </Link>
              </div>
            </div>
          )}

          <Card className={`border-2 ${severity?.border}`}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{severity?.icon}</span>
              <div>
                <p className="font-bold text-gray-900">Severity Level: {severity?.label}</p>
                <p className="text-sm text-gray-500">{result.severity_reason}</p>
              </div>
            </div>

            {/* Possible Conditions */}
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Possible Conditions</h3>
              <div className="space-y-2">
                {result.possible_conditions?.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Badge variant={c.likelihood === 'high' ? 'warning' : c.likelihood === 'medium' ? 'info' : 'default'}>
                      {c.likelihood}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Specialist */}
            {result.suggested_specialist && (
              <div className="mb-4 p-3 bg-primary-50 rounded-lg flex items-center gap-3">
                <Stethoscope className="w-5 h-5 text-primary-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-primary-900">Suggested Specialist</p>
                  <p className="text-sm text-primary-700">{result.suggested_specialist}</p>
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Recommendations</h3>
              <p className="text-sm text-gray-700">{result.recommendations}</p>
            </div>

            {/* Care Tips */}
            {result.general_care_tips?.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 mb-2">General Care Tips</h3>
                <ul className="space-y-1">
                  {result.general_care_tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <MedicalDisclaimer />
          </Card>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={reset} className="flex-1">New Assessment</Button>
            <Link to="/patient/doctors" className="btn-primary flex-1 text-center">Find a Doctor</Link>
          </div>
        </div>
      )}
    </div>
  )
}
