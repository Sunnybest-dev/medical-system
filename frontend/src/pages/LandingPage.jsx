import { Link } from 'react-router-dom'
import { Brain, Stethoscope, Video, Shield, Clock, Globe, ArrowRight, AlertTriangle, Heart } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import DarkModeToggle from '@/components/ui/DarkModeToggle'
import { useDarkMode } from '@/hooks/useDarkMode'

const features = [
  { icon: Brain, title: 'AI Health Assessment', desc: 'Get preliminary health insights powered by Gemini AI with intelligent follow-up questions.', color: 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400' },
  { icon: Stethoscope, title: 'Verified Doctors', desc: 'Connect with verified healthcare professionals who undergo rigorous license verification.', color: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' },
  { icon: Video, title: 'Video Consultations', desc: 'Consult with doctors from anywhere via secure HD video calls powered by Jitsi Meet.', color: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' },
  { icon: Shield, title: 'Secure & Private', desc: 'Your health data is protected with JWT authentication and role-based access control.', color: 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400' },
  { icon: Clock, title: 'Emergency Assistance', desc: 'Priority emergency consultations connecting you to on-duty doctors within minutes.', color: 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400' },
  { icon: Globe, title: 'Global Access', desc: 'Access healthcare from anywhere. Filter doctors by country, language, and specialization.', color: 'bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400' },
]

const stats = [
  { value: '10K+', label: 'Patients Served' },
  { value: '500+', label: 'Verified Doctors' },
  { value: '50+', label: 'Specializations' },
  { value: '24/7', label: 'Emergency Support' },
]

export default function LandingPage() {
  const [dark, setDark] = useDarkMode()

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-200">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-3">
            <DarkModeToggle dark={dark} setDark={setDark} />
            <Link to="/login" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="btn-primary text-sm px-4 py-2">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-950 dark:to-primary-950 -z-10" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary-200 dark:bg-primary-900 rounded-full blur-3xl opacity-30 -z-10" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-200 dark:bg-purple-900 rounded-full blur-3xl opacity-20 -z-10" />

        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-primary-200 dark:border-primary-800">
            <Brain className="w-4 h-4" /> AI-Powered Telehealth Platform
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
            Healthcare at Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600">
              Fingertips
            </span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-6 max-w-2xl mx-auto leading-relaxed">
            Mxta connects you with verified doctors, provides AI-powered health assessments, and enables video consultations — all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
            <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-primary-500/30 text-base">
              Start for Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/register/doctor" className="inline-flex items-center justify-center gap-2 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold px-8 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 transition-all text-base">
              Join as Doctor
            </Link>
          </div>
          <div className="mt-8 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 max-w-lg mx-auto">
            <strong>⚠️ Medical Disclaimer:</strong> Mxta provides preliminary health information only. It does NOT replace professional medical advice, diagnosis, or treatment.
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-12 bg-primary-600">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-bold text-white">{value}</p>
              <p className="text-primary-200 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Everything You Need</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-3">A complete telehealth ecosystem for patients and doctors</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all hover:-translate-y-0.5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-14">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Describe Symptoms', desc: 'Use our AI assessment tool to describe your symptoms and get instant insights.' },
              { step: '02', title: 'Find a Doctor', desc: 'Browse verified doctors by specialization, language, and availability.' },
              { step: '03', title: 'Consult via Video', desc: 'Book and join a secure video consultation from the comfort of your home.' },
            ].map(({ step, title, desc }) => (
              <div key={step}>
                <div className="w-14 h-14 bg-primary-100 dark:bg-primary-950 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary-600 dark:text-primary-400 font-bold text-lg">{step}</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency CTA */}
      <section className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-14 text-center text-white">
        <div className="max-w-2xl mx-auto">
          <AlertTriangle className="w-10 h-10 mx-auto mb-4 opacity-90" />
          <h2 className="text-2xl font-bold mb-3">Emergency? We're Here 24/7</h2>
          <p className="text-red-100 mb-2">Connect to emergency-duty doctors instantly via priority video consultation.</p>
          <p className="text-red-200 text-sm">Always call 911/999/112 for life-threatening emergencies first.</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 text-center bg-gradient-to-br from-primary-600 to-purple-700">
        <div className="max-w-2xl mx-auto">
          <Heart className="w-12 h-12 text-white/80 mx-auto mb-4 fill-white/80" />
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Take Control of Your Health?</h2>
          <p className="text-primary-100 mb-8">Join thousands of patients and doctors on Mxta</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" className="inline-flex items-center justify-center bg-white text-primary-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-primary-50 transition-colors text-base">
              Create Patient Account
            </Link>
            <Link to="/register/doctor" className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3.5 rounded-xl border border-white/30 transition-colors text-base">
              Register as Doctor
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 border-t border-gray-800 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-sm text-gray-500 text-center">
            © 2024 Mxta. All rights reserved. | For informational purposes only — not a substitute for professional medical advice.
          </p>
        </div>
      </footer>
    </div>
  )
}
