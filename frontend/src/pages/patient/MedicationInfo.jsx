import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Pill, Search, AlertTriangle } from 'lucide-react'
import { aiService } from '@/services'
import { Card, MedicalDisclaimer, Spinner } from '@/components/ui'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

export default function MedicationInfo() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)

  const { mutate, isPending } = useMutation({
    mutationFn: () => aiService.getMedicationInfo(query),
    onSuccess: ({ data }) => setResult(data),
    onError: () => toast.error('Failed to get medication info'),
  })

  const handleSearch = () => {
    if (!query.trim()) return toast.error('Enter a medication name')
    mutate()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Pill className="w-5 h-5 text-primary-600" /> Medication Information
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Search for drug information powered by AI</p>
      </div>

      <MedicalDisclaimer />

      <Card>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Enter medication name (e.g., Ibuprofen, Amoxicillin)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} loading={isPending}>Search</Button>
        </div>
      </Card>

      {isPending && <div className="flex justify-center py-8"><Spinner size="lg" /></div>}

      {result && !result.error && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Pill className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{result.name}</h2>
                {result.generic_name && <p className="text-sm text-gray-500">Generic: {result.generic_name}</p>}
                {result.drug_class && <p className="text-xs text-primary-600 font-medium mt-0.5">{result.drug_class}</p>}
              </div>
            </div>

            <div className="space-y-4">
              {result.purpose && (
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">Purpose</h3>
                  <p className="text-sm text-gray-600">{result.purpose}</p>
                </div>
              )}

              {result.common_side_effects?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-2">Common Side Effects</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.common_side_effects.map((s, i) => (
                      <span key={i} className="bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.serious_side_effects?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h3 className="font-semibold text-red-900 text-sm mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Serious Side Effects
                  </h3>
                  <ul className="space-y-1">
                    {result.serious_side_effects.map((s, i) => (
                      <li key={i} className="text-sm text-red-700">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.contraindications?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-2">Contraindications</h3>
                  <ul className="space-y-1">
                    {result.contraindications.map((c, i) => (
                      <li key={i} className="text-sm text-gray-600">• {c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.warnings?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <h3 className="font-semibold text-amber-900 text-sm mb-2">Warnings</h3>
                  <ul className="space-y-1">
                    {result.warnings.map((w, i) => (
                      <li key={i} className="text-sm text-amber-700">• {w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>

          <MedicalDisclaimer />
        </div>
      )}

      {result?.error && (
        <Card className="text-center py-8">
          <p className="text-gray-500">{result.error}</p>
        </Card>
      )}
    </div>
  )
}
