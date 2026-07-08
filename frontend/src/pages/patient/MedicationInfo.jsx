import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Pill, Search, AlertTriangle, CheckCircle, Info,
  Sparkles, ShieldAlert, BookOpen, FlaskConical, ChevronDown, ChevronUp, Clock, Tag, Zap
} from 'lucide-react'
import { aiService } from '@/services'
import { MedicalDisclaimer, Spinner, Badge } from '@/components/ui'
import Button from '@/components/ui/Button'
import { cn } from '@/utils'
import toast from 'react-hot-toast'

const POPULAR_DRUGS = [
  'Ibuprofen', 'Paracetamol', 'Amoxicillin', 'Metformin',
  'Lisinopril', 'Atorvastatin', 'Omeprazole', 'Azithromycin',
  'Ciprofloxacin', 'Doxycycline', 'Cetirizine', 'Loratadine',
]

function Section({ icon: Icon, title, children, color = 'gray', defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  const colors = {
    gray: 'text-gray-700 dark:text-gray-300',
    red: 'text-red-700 dark:text-red-400',
    amber: 'text-amber-700 dark:text-amber-400',
    green: 'text-emerald-700 dark:text-emerald-400',
    blue: 'text-blue-700 dark:text-blue-400',
    purple: 'text-purple-700 dark:text-purple-400',
  }
  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <span className={cn('flex items-center gap-2 text-sm font-semibold', colors[color])}>
          <Icon className="w-4 h-4" /> {title}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  )
}

export default function MedicationInfo() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)

  const { mutate, isPending } = useMutation({
    mutationFn: () => aiService.getMedicationInfo(query),
    onSuccess: ({ data }) => setResult(data),
    onError: () => toast.error('Failed to get medication info'),
  })

  const handleSearch = useCallback((name = query) => {
    const q = name || query
    if (!q.trim()) return toast.error('Enter a medication name')
    setQuery(q)
    setResult(null)
    setTimeout(() => mutate(), 0)
  }, [query, mutate])

  const sourceLabel = result?.source === 'fda' ? '🏛️ FDA + RxNorm' : '🤖 AI Generated'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
          <Pill className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Drug & Medication Info</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> RxNorm · FDA · Gemini AI
          </p>
        </div>
      </div>

      <MedicalDisclaimer />

      {/* Search */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Enter drug or medication name (e.g. Paracetamol, Metformin...)"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={() => handleSearch()} loading={isPending}>Search</Button>
        </div>
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Popular searches:</p>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_DRUGS.map(drug => (
              <button
                key={drug}
                onClick={() => handleSearch(drug)}
                className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary-100 dark:hover:bg-primary-950 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                {drug}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isPending && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Looking up RxNorm → FDA database...</p>
        </div>
      )}

      {result && !result.error && (
        <div className="space-y-3">
          {/* Drug header */}
          <div className="bg-gradient-to-br from-primary-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg shadow-primary-500/20">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Pill className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{result.name}</h2>
                  {result.generic_name && (
                    <p className="text-primary-200 text-sm">Generic: {result.generic_name}</p>
                  )}
                </div>
              </div>
              <Badge className="bg-white/20 text-white border-0 flex-shrink-0">{sourceLabel}</Badge>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {result.drug_class && (
                <span className="bg-white/15 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                  <FlaskConical className="w-3 h-3" /> {result.drug_class}
                </span>
              )}
              {result.route && (
                <span className="bg-white/15 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {result.route}
                </span>
              )}
            </div>

            {/* Brand names from RxNorm */}
            {result.brand_names?.length > 0 && (
              <div className="mt-3">
                <p className="text-white/70 text-xs mb-1.5 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Brand names
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.brand_names.map((b, i) => (
                    <span key={i} className="bg-white/15 text-white text-xs px-2.5 py-0.5 rounded-full">{b}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Purpose */}
          {result.purpose && (
            <Section icon={BookOpen} title="Purpose / Uses" color="blue">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.purpose}</p>
            </Section>
          )}

          {/* How it works */}
          {result.how_it_works && (
            <Section icon={FlaskConical} title="How It Works" color="blue" defaultOpen={false}>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.how_it_works}</p>
            </Section>
          )}

          {/* How to take */}
          {result.how_to_take && (
            <Section icon={Clock} title="Dosage & Administration" color="green" defaultOpen={false}>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.how_to_take}</p>
            </Section>
          )}

          {/* Common side effects */}
          {result.common_side_effects?.length > 0 && (
            <Section icon={Info} title="Common Side Effects" color="amber">
              <div className="flex flex-wrap gap-2">
                {result.common_side_effects.map((s, i) => (
                  <span key={i} className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs px-2.5 py-1 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Serious side effects */}
          {result.serious_side_effects?.length > 0 && (
            <Section icon={AlertTriangle} title="Serious Side Effects" color="red">
              <ul className="space-y-1.5">
                {result.serious_side_effects.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {s}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Contraindications */}
          {result.contraindications?.length > 0 && (
            <Section icon={ShieldAlert} title="Contraindications" color="red" defaultOpen={false}>
              <ul className="space-y-1.5">
                {result.contraindications.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <CheckCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" /> {c}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Warnings */}
          {result.warnings?.length > 0 && (
            <Section icon={ShieldAlert} title="Warnings" color="amber">
              <ul className="space-y-1.5">
                {result.warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {w}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Drug interactions */}
          {result.drug_interactions?.length > 0 && (
            <Section icon={Zap} title="Drug Interactions" color="purple" defaultOpen={false}>
              <ul className="space-y-2">
                {result.drug_interactions.map((interaction, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300 border-l-2 border-purple-400 pl-3">
                    {interaction.severity && (
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase mr-2">
                        {interaction.severity}
                      </span>
                    )}
                    {interaction.description}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <MedicalDisclaimer />
        </div>
      )}

      {result?.error && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center">
          <Pill className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{result.error}</p>
        </div>
      )}
    </div>
  )
}
