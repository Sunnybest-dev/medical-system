import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Brain, ChevronRight, AlertTriangle, CheckCircle, Stethoscope,
  ArrowLeft, History, Search, Sparkles, Activity, Heart, Thermometer,
  Wind, Zap, Eye, Ear, Bone, Pill, FileText, ShieldAlert, Clock, Info,
  Star, MapPin, CalendarPlus, Phone
} from 'lucide-react'
import { aiService } from '@/services'
import { Card, Badge, MedicalDisclaimer, Spinner, Avatar } from '@/components/ui'
import Button from '@/components/ui/Button'
import { cn, severityConfig } from '@/utils'
import toast from 'react-hot-toast'

// Fallback symptoms if API returns empty
const FALLBACK_SYMPTOMS = [
  { id: 'f1', name: 'Headache', category: 'Neurological', is_emergency: false },
  { id: 'f2', name: 'Fever', category: 'General', is_emergency: false },
  { id: 'f3', name: 'Cough', category: 'Respiratory', is_emergency: false },
  { id: 'f4', name: 'Chest Pain', category: 'Cardiac', is_emergency: true },
  { id: 'f5', name: 'Shortness of Breath', category: 'Respiratory', is_emergency: true },
  { id: 'f6', name: 'Fatigue', category: 'General', is_emergency: false },
  { id: 'f7', name: 'Nausea', category: 'Digestive', is_emergency: false },
  { id: 'f8', name: 'Vomiting', category: 'Digestive', is_emergency: false },
  { id: 'f9', name: 'Diarrhea', category: 'Digestive', is_emergency: false },
  { id: 'f10', name: 'Abdominal Pain', category: 'Digestive', is_emergency: false },
  { id: 'f11', name: 'Back Pain', category: 'Musculoskeletal', is_emergency: false },
  { id: 'f12', name: 'Joint Pain', category: 'Musculoskeletal', is_emergency: false },
  { id: 'f13', name: 'Dizziness', category: 'Neurological', is_emergency: false },
  { id: 'f14', name: 'Sore Throat', category: 'ENT', is_emergency: false },
  { id: 'f15', name: 'Runny Nose', category: 'ENT', is_emergency: false },
  { id: 'f16', name: 'Skin Rash', category: 'Dermatological', is_emergency: false },
  { id: 'f17', name: 'Eye Pain', category: 'Ophthalmological', is_emergency: false },
  { id: 'f18', name: 'Ear Pain', category: 'ENT', is_emergency: false },
  { id: 'f19', name: 'Muscle Weakness', category: 'Neurological', is_emergency: false },
  { id: 'f20', name: 'Numbness / Tingling', category: 'Neurological', is_emergency: false },
  { id: 'f21', name: 'Palpitations', category: 'Cardiac', is_emergency: true },
  { id: 'f22', name: 'Swelling', category: 'General', is_emergency: false },
  { id: 'f23', name: 'Loss of Appetite', category: 'General', is_emergency: false },
  { id: 'f24', name: 'Insomnia', category: 'Neurological', is_emergency: false },
]

const categoryIcons = {
  Neurological: Brain, Cardiac: Heart, Respiratory: Wind, General: Activity,
  Digestive: Pill, Musculoskeletal: Bone, ENT: Ear, Dermatological: Zap,
  Ophthalmological: Eye, default: Thermometer,
}

const STEPS = [
  { label: 'Select Symptoms', icon: Activity },
  { label: 'Follow-up', icon: Brain },
  { label: 'Results', icon: Sparkles },
]

export default function AIAssessment() {
  const [step, setStep] = useState(0)
  const [selectedSymptoms, setSelectedSymptoms] = useState([])
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [search, setSearch] = useState('')
  const [customInput, setCustomInput] = useState('')
  const [customSymptoms, setCustomSymptoms] = useState([])

  const { data: symptomsData, isLoading } = useQuery({
    queryKey: ['symptoms'],
    queryFn: () => aiService.getSymptoms().then((r) => r.data.results || r.data),
  })

  const baseSymptoms = symptomsData?.length ? symptomsData : FALLBACK_SYMPTOMS
  const allSymptoms = [...baseSymptoms, ...customSymptoms]
  const symptoms = allSymptoms.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  // Group by category — includes custom typed symptoms
  const grouped = symptoms.reduce((acc, s) => {
    const cat = s.category || 'General'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  const addCustomSymptom = () => {
    const trimmed = customInput.trim()
    if (!trimmed) return
    const id = `custom_${trimmed.toLowerCase().replace(/\s+/g, '_')}`
    if (customSymptoms.find(s => s.id === id)) { setCustomInput(''); return }
    const newSymptom = { id, name: trimmed, category: 'Custom', is_emergency: false }
    setCustomSymptoms(prev => [...prev, newSymptom])
    setSelectedSymptoms(prev => [...prev, id])
    setCustomInput('')
  }

  const followupMutation = useMutation({
    mutationFn: (syms) => aiService.getFollowupQuestions(syms),
    onSuccess: ({ data }) => { setQuestions(data.questions || []); setStep(1) },
    onError: () => toast.error('Failed to get follow-up questions'),
  })

  const assessMutation = useMutation({
    mutationFn: (data) => aiService.performAssessment(data),
    onSuccess: ({ data }) => { setResult(data.result || data); setStep(2) },
    onError: () => toast.error('Assessment failed. Please try again.'),
  })

  const toggleSymptom = (id) =>
    setSelectedSymptoms(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])

  const handleNext = () => {
    if (selectedSymptoms.length === 0) return toast.error('Please select or type at least one symptom')
    const names = allSymptoms.filter(s => selectedSymptoms.includes(s.id)).map(s => s.name)
    followupMutation.mutate(names)
  }

  const handleAssess = () => {
    const followupAnswers = {}
    questions.forEach((q, i) => { followupAnswers[q] = answers[i] || 'Not specified' })
    const selectedNames = allSymptoms.filter(s => selectedSymptoms.includes(s.id)).map(s => s.name)
    const realIds = selectedSymptoms.filter(id => !String(id).startsWith('f') && !String(id).startsWith('custom_'))
    assessMutation.mutate({
      symptom_ids: realIds,
      symptom_names: selectedNames,
      followup_answers: followupAnswers,
    })
  }

  const reset = () => {
    setStep(0); setSelectedSymptoms([]); setQuestions([]); setAnswers({}); setResult(null); setSearch(''); setCustomInput(''); setCustomSymptoms([])
  }

  const severity = result ? severityConfig[result.severity_level] : null

  const { data: suggestedDoctorsData, isLoading: loadingDoctors } = useQuery({
    queryKey: ['suggest-doctors', result?.suggested_specialist, result?.severity_level],
    queryFn: () => aiService.suggestDoctors(result.suggested_specialist, result.severity_level).then(r => r.data),
    enabled: !!result?.suggested_specialist && ['red', 'yellow'].includes(result?.severity_level),
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">MediAI Assessment</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Powered by MediAI
            </p>
          </div>
        </div>
        <Link
          to="/patient/assess/history"
          className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
        >
          <History className="w-4 h-4" /> History
        </Link>
      </div>

      <MedicalDisclaimer />

      {/* Step Indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const done = i < step
          const active = i === step
          return (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center transition-all',
                  done ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' :
                  active ? 'bg-primary-600 shadow-lg shadow-primary-500/30' :
                  'bg-gray-100 dark:bg-gray-800'
                )}>
                  {done
                    ? <CheckCircle className="w-5 h-5 text-white" />
                    : <Icon className={cn('w-4 h-4', active ? 'text-white' : 'text-gray-400')} />
                  }
                </div>
                <span className={cn('text-xs font-medium hidden sm:block',
                  active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'
                )}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('flex-1 h-0.5 mx-2 mb-4', done ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-700')} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── STEP 0: Select Symptoms ── */}
      {step === 0 && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search symptoms..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>

          {/* Type your own symptom */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-500" />
              Can't find your symptom? Type it in
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. burning sensation, blurry vision, ringing in ears..."
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomSymptom()}
                className="input flex-1"
              />
              <Button
                onClick={addCustomSymptom}
                disabled={!customInput.trim()}
                variant="secondary"
                className="flex-shrink-0"
              >
                Add
              </Button>
            </div>
            {customSymptoms.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {customSymptoms.map(s => (
                  <span key={s.id} className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-medium px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-800">
                    ✏️ {s.name}
                    <button
                      onClick={() => {
                        setCustomSymptoms(prev => prev.filter(c => c.id !== s.id))
                        setSelectedSymptoms(prev => prev.filter(id => id !== s.id))
                      }}
                      className="ml-0.5 hover:text-purple-900 dark:hover:text-purple-100"
                    >×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Selected pills */}
          {selectedSymptoms.length > 0 && (
            <div className="bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-xl p-3">
              <p className="text-xs font-medium text-primary-700 dark:text-primary-300 mb-2">
                Selected ({selectedSymptoms.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {allSymptoms
                  .filter(s => selectedSymptoms.includes(s.id))
                  .map(s => (
                    <button
                      key={s.id}
                      onClick={() => toggleSymptom(s.id)}
                      className="inline-flex items-center gap-1 bg-primary-600 text-white text-xs font-medium px-2.5 py-1 rounded-full hover:bg-primary-700 transition-colors"
                    >
                      {s.name} ×
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Symptoms by category */}
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([category, items]) => {
                const CatIcon = categoryIcons[category] || categoryIcons.default
                return (
                  <div key={category} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                      <CatIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{category}</span>
                      <span className="ml-auto text-xs text-gray-400">{items.length}</span>
                    </div>
                    <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {items.map(symptom => {
                        const selected = selectedSymptoms.includes(symptom.id)
                        return (
                          <button
                            key={symptom.id}
                            onClick={() => toggleSymptom(symptom.id)}
                            className={cn(
                              'px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all text-left flex items-center gap-2',
                              symptom.is_emergency
                                ? selected
                                  ? 'bg-red-600 border-red-600 text-white'
                                  : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:border-red-400'
                                : selected
                                  ? 'bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-500/20'
                                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-950'
                            )}
                          >
                            {symptom.is_emergency && <AlertTriangle className="w-3 h-3 flex-shrink-0" />}
                            <span className="truncate">{symptom.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedSymptoms.length} symptom{selectedSymptoms.length !== 1 ? 's' : ''} selected
            </p>
            <Button onClick={handleNext} loading={followupMutation.isPending} disabled={selectedSymptoms.length === 0}>
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 1: Follow-up Questions ── */}
      {step === 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="w-9 h-9 bg-primary-100 dark:bg-primary-950 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Follow-up Questions</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Help the AI understand your condition better</p>
            </div>
          </div>

          <div className="space-y-5">
            {questions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No follow-up questions. Click "Get Assessment" to proceed.
              </p>
            ) : (
              questions.map((q, i) => (
                <div key={i} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 rounded-full text-xs font-bold mr-2">{i + 1}</span>
                    {q}
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Type your answer here..."
                    value={answers[i] || ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                    className="input resize-none"
                  />
                </div>
              ))
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setStep(0)}>
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button onClick={handleAssess} loading={assessMutation.isPending} className="flex-1">
              <Sparkles className="w-4 h-4" /> Get MediAI Assessment
            </Button>
          </div>
        </div>
      )}

      {/* ── MediAI Assessing Loader ── */}
      {assessMutation.isPending && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
          <div className="relative w-20 h-20">
            <svg className="animate-spin w-20 h-20" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" className="text-gray-200 dark:text-gray-700" />
              <circle cx="40" cy="40" r="34" stroke="url(#grad)" strokeWidth="6"
                strokeLinecap="round" strokeDasharray="160" strokeDashoffset="110" />
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1" />
                  <stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Brain className="w-7 h-7 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <p className="mt-5 text-base font-semibold text-gray-800 dark:text-white">MediAI is assessing your diagnosis</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Analysing symptoms &amp; generating your report…</p>
        </div>
      )}

      {/* ── STEP 2: Results ── */}
      {step === 2 && result && (
        <div className="space-y-4">
          {/* Emergency alert */}
          {result.severity_level === 'red' && (
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl p-5 flex items-start gap-4 shadow-lg shadow-red-500/20">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">⚠️ Emergency — See a Doctor Immediately</p>
                <p className="text-red-100 text-sm mt-1">Your symptoms may require urgent medical attention. Call emergency services (911/999/112) or visit the nearest ER right away.</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Link to="/patient/emergency" className="inline-flex items-center gap-2 bg-white text-red-600 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-red-50 transition-colors">
                    <Zap className="w-4 h-4" /> Request Emergency Consultation
                  </Link>
                  <a href="tel:911" className="inline-flex items-center gap-2 bg-white/20 text-white font-semibold text-sm px-4 py-2 rounded-xl hover:bg-white/30 transition-colors">
                    <Phone className="w-4 h-4" /> Call Emergency
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Severity card */}
          <div className={cn('rounded-2xl p-5 border-2', severity?.border, severity?.bg)}>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl">{severity?.icon}</span>
              <div>
                <p className={cn('font-bold text-lg', severity?.color)}>
                  {severity?.label}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{result.severity_reason}</p>
              </div>
            </div>
          </div>

          {/* Possible Conditions */}
          {result.possible_conditions?.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary-600" /> Possible Conditions
              </h3>
              <div className="space-y-2">
                {result.possible_conditions.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <Badge variant={c.likelihood === 'high' ? 'warning' : c.likelihood === 'medium' ? 'info' : 'default'}>
                      {c.likelihood}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{c.name}</p>
                      {c.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Specialist */}
          {result.suggested_specialist && (
            <div className="bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wide">Suggested Specialist</p>
                <p className="font-semibold text-primary-900 dark:text-primary-200">{result.suggested_specialist}</p>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> Recommendations
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.recommendations}</p>
            </div>
          )}

          {/* Care Tips */}
          {result.general_care_tips?.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">General Care Tips</h3>
              <ul className="space-y-2">
                {result.general_care_tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Diagnosis Summary */}
          {result.diagnosis_summary && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-primary-200 dark:border-primary-800 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-600" /> Assessment Summary
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.diagnosis_summary}</p>
            </div>
          )}

          {/* Suggested Medications */}
          {result.suggested_medications?.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 bg-emerald-50 dark:bg-emerald-950 border-b border-emerald-100 dark:border-emerald-900">
                <Pill className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">Suggested Medications</h3>
                <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 rounded-full">
                  Always consult a doctor before taking
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {result.suggested_medications.map((med, i) => (
                  <div key={i} className="p-5 space-y-3">
                    {/* Med header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-950 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Pill className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{med.name}</p>
                          {med.generic_name && <p className="text-xs text-gray-400">Generic: {med.generic_name}</p>}
                          {med.purpose && <p className="text-xs text-gray-500 dark:text-gray-400">{med.purpose}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {med.otc_or_prescription && (
                          <Badge variant={med.otc_or_prescription === 'OTC' ? 'success' : 'warning'}>
                            {med.otc_or_prescription}
                          </Badge>
                        )}
                        <Badge variant={med.source === 'fda' ? 'info' : 'default'}>
                          {med.source === 'fda' ? '🏛️ FDA Data' : '🤖 AI'}
                        </Badge>
                      </div>
                    </div>

                    {/* Drug class */}
                    {med.drug_class && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> {med.drug_class}
                      </p>
                    )}

                    {/* How to take */}
                    {med.how_to_take && (
                      <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-950 rounded-xl p-3">
                        <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-0.5">How to Take</p>
                          <p className="text-sm text-blue-800 dark:text-blue-200">{med.how_to_take}</p>
                          {med.duration && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Duration: {med.duration}</p>}
                        </div>
                      </div>
                    )}

                    {/* Side effects */}
                    {med.common_side_effects?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5" /> Common Side Effects
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {med.common_side_effects.map((se, j) => (
                            <span key={j} className="text-xs bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                              {se}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Serious side effects */}
                    {med.serious_side_effects?.length > 0 && (
                      <div className="flex items-start gap-2.5 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-xl p-3">
                        <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1">Serious Side Effects</p>
                          <ul className="space-y-0.5">
                            {med.serious_side_effects.map((se, j) => (
                              <li key={j} className="text-xs text-orange-700 dark:text-orange-300">{se}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Contraindications */}
                    {med.contraindications?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" /> Do Not Use If
                        </p>
                        <ul className="space-y-0.5">
                          {med.contraindications.map((c, j) => (
                            <li key={j} className="text-xs text-gray-600 dark:text-gray-400">• {c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Overdose warning */}
                    {med.overdose_warning && (
                      <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-3">
                        <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-0.5">⚠️ Overdose Warning</p>
                          <p className="text-sm text-red-700 dark:text-red-300">{med.overdose_warning}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Doctors from platform */}
          {['red', 'yellow'].includes(result.severity_level) && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-primary-200 dark:border-primary-800 overflow-hidden">
              <div className={cn(
                'px-5 py-4 flex items-center gap-3',
                result.severity_level === 'red'
                  ? 'bg-red-50 dark:bg-red-950 border-b border-red-100 dark:border-red-900'
                  : 'bg-primary-50 dark:bg-primary-950 border-b border-primary-100 dark:border-primary-900'
              )}>
                <Stethoscope className={cn('w-5 h-5', result.severity_level === 'red' ? 'text-red-600 dark:text-red-400' : 'text-primary-600 dark:text-primary-400')} />
                <div>
                  <h3 className={cn('font-bold', result.severity_level === 'red' ? 'text-red-900 dark:text-red-200' : 'text-primary-900 dark:text-primary-200')}>
                    {result.severity_level === 'red' ? '🚨 You need to see a doctor now' : '👨‍⚕️ We recommend seeing a doctor'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {result.suggested_specialist
                      ? `Suggested specialist: ${result.suggested_specialist} — book with one of our verified doctors below`
                      : 'Book an appointment with one of our verified doctors below'}
                  </p>
                </div>
              </div>

              <div className="p-4">
                {loadingDoctors ? (
                  <div className="flex justify-center py-6"><Spinner /></div>
                ) : suggestedDoctorsData?.doctors?.length > 0 ? (
                  <div className="space-y-3">
                    {suggestedDoctorsData.doctors.map(doctor => (
                      <div key={doctor.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="relative flex-shrink-0">
                          <Avatar name={doctor.full_name} src={doctor.avatar} size="md" />
                          <span className={cn(
                            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800',
                            doctor.online_status === 'available' ? 'bg-emerald-500' :
                            doctor.online_status === 'emergency_duty' ? 'bg-red-500' :
                            doctor.online_status === 'busy' ? 'bg-amber-500' : 'bg-gray-400'
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{doctor.full_name}</p>
                          <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">{doctor.specialization_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-0.5 text-xs text-gray-500">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              {doctor.average_rating || '0.0'}
                            </span>
                            {doctor.country && (
                              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                                <MapPin className="w-3 h-3" /> {doctor.country}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">${doctor.consultation_fee}</span>
                          </div>
                        </div>
                        <Link
                          to={`/patient/doctors/${doctor.id}/book`}
                          className={cn(
                            'flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors',
                            result.severity_level === 'red'
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-primary-600 hover:bg-primary-700 text-white'
                          )}
                        >
                          <CalendarPlus className="w-3.5 h-3.5" /> Book
                        </Link>
                      </div>
                    ))}
                    <Link
                      to="/patient/doctors"
                      className="block text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium pt-1"
                    >
                      View all doctors →
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No available specialists found right now.</p>
                    <Link to="/patient/doctors" className="btn-primary text-sm inline-flex items-center gap-2">
                      <Stethoscope className="w-4 h-4" /> Browse All Doctors
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          <MedicalDisclaimer />

          <div className="flex gap-3">
            <Button variant="secondary" onClick={reset} className="flex-1">
              New Assessment
            </Button>
            <Link to="/patient/doctors" className="btn-primary flex-1 text-center flex items-center justify-center gap-2">
              <Stethoscope className="w-4 h-4" /> Find a Doctor
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
