import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Upload, Trash2, Download } from 'lucide-react'
import { patientService } from '@/services'
import { Card, Badge, EmptyState, Spinner } from '@/components/ui'
import { Select } from '@/components/ui/FormFields'
import Button from '@/components/ui/Button'
import { formatDate } from '@/utils'
import toast from 'react-hot-toast'

const DOC_TYPES = {
  lab_report: { label: 'Lab Report', color: 'bg-blue-100 text-blue-700' },
  scan: { label: 'Scan Result', color: 'bg-purple-100 text-purple-700' },
  prescription: { label: 'Prescription', color: 'bg-green-100 text-green-700' },
  xray: { label: 'X-Ray', color: 'bg-amber-100 text-amber-700' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-700' },
}

export default function MedicalRecords() {
  const [docType, setDocType] = useState('lab_report')
  const [title, setTitle] = useState('')
  const qc = useQueryClient()

  const { data: docs, isLoading } = useQuery({
    queryKey: ['medical-documents'],
    queryFn: () => patientService.getDocuments().then((r) => r.data.results || r.data),
  })

  const uploadMutation = useMutation({
    mutationFn: (formData) => patientService.uploadDocument(formData),
    onSuccess: () => { qc.invalidateQueries(['medical-documents']); toast.success('Document uploaded!') },
    onError: () => toast.error('Upload failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => patientService.deleteDocument(id),
    onSuccess: () => { qc.invalidateQueries(['medical-documents']); toast.success('Document deleted') },
  })

  const handleUpload = (e) => {
    const file = e.target.files[0]
    if (!file || !title) return toast.error('Please enter a title and select a file')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('document_type', docType)
    fd.append('title', title)
    uploadMutation.mutate(fd)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Medical Records</h1>

      {/* Upload */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Upload Document</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input className="input" placeholder="Document title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
            {Object.entries(DOC_TYPES).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
          </Select>
          <label className="btn-primary flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            {uploadMutation.isPending ? 'Uploading...' : 'Choose File'}
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} disabled={uploadMutation.isPending} />
          </label>
        </div>
      </Card>

      {/* Documents */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : docs?.length === 0 ? (
        <EmptyState icon={FileText} title="No documents uploaded" description="Upload your lab reports, scans, prescriptions, and more" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {docs?.map((doc) => (
            <Card key={doc.id} className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{doc.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={DOC_TYPES[doc.document_type]?.color}>{DOC_TYPES[doc.document_type]?.label}</Badge>
                  <span className="text-xs text-gray-400">{formatDate(doc.uploaded_at)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-primary-600">
                  <Download className="w-4 h-4" />
                </a>
                <button onClick={() => deleteMutation.mutate(doc.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
