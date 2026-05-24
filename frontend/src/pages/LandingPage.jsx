import { Link } from 'react-router-dom'
import { Brain, Stethoscope, Video, Shield, Clock, Globe, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react'

const features = [
  { icon: Brain, title: 'AI Health Assessment', desc: 'Get preliminary health insights powered by Gemini AI. Understand your symptoms with intelligent follow-up questions.' },
  { icon: Stethoscope, title: 'Verified Doctors', desc: 'Connect with verified healthcare professionals. All doctors undergo rigorous identity and license verification.' },
  { icon: Video, title: 'Video Consultations', desc: 'Consult with doctors from anywhere via secure HD video calls powered by Jitsi Meet.' },
  { icon: Shield, title: 'Secure & Private', desc: 'Your health data is protected with JWT authentication, encryption, and role-based access control.' },
  { icon: Clock, title: 'Emergency Assistance', desc: 'Priority emergency consultations connecting you to on-duty doctors within minutes.' },
  { icon: Globe, title: 'Global Access', desc: 'Access healthcare from anywhere in the world. Filter doctors by country, language, and specialization.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">MediAI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign In</Link>
          <Link to="/register" className="btn-primary text-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-blue-50 to-teal-50 px-6 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Brain className="w-4 h-4" /> AI-Powered Telehealth Platform
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
            Healthcare at Your <span className="text-primary-600">Fingertips</span>
          </h1>
          <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto">
            MediAI connects you with verified doctors, provides AI-powered health assessments, and enables video consultations — all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link to="/register" className="btn-primary text-base px-8 py-3 flex items-center justify-center gap-2">
              Start for Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/register/doctor" className="btn-secondary text-base px-8 py-3">
              Join as Doctor
            </Link>
          </div>
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 max-w-lg mx-auto">
            <strong>⚠️ Medical Disclaimer:</strong> MediAI provides preliminary health information only. It does NOT replace professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional.
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Everything You Need</h2>
          <p className="text-gray-500 mt-2">A complete telehealth ecosystem for patients and doctors</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Emergency CTA */}
      <section className="bg-red-600 px-6 py-12 text-center text-white">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3" />
        <h2 className="text-2xl font-bold mb-2">Emergency? We're Here</h2>
        <p className="text-red-100 mb-4">Connect to emergency-duty doctors instantly via priority video consultation.</p>
        <p className="text-red-200 text-sm">Always call 911/999/112 for life-threatening emergencies.</p>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center bg-gray-50">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
        <p className="text-gray-500 mb-8">Join thousands of patients and doctors on MediAI</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/register" className="btn-primary text-base px-8 py-3">Create Patient Account</Link>
          <Link to="/register/doctor" className="btn-secondary text-base px-8 py-3">Register as Doctor</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8 text-center text-sm text-gray-400">
        <p>© 2024 MediAI. All rights reserved. | This platform is for informational purposes only and does not provide medical diagnosis.</p>
      </footer>
    </div>
  )
}
