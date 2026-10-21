import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By creating an account or using TaskGenius, you agree to these Terms & Conditions. If you do not agree, please discontinue use of the application.',
  },
  {
    title: '2. Your Account',
    body: 'You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. Provide accurate information when registering and update it promptly if it changes.',
  },
  {
    title: '3. Acceptable Use',
    body: 'TaskGenius is provided for personal productivity use. You agree not to misuse the service, interfere with its normal operation, attempt unauthorized access, or use it for any unlawful purpose.',
  },
  {
    title: '4. Your Data',
    body: 'Your tasks, notes, focus sessions, and preferences belong to you. We store them to provide the service features you use. You can request deletion of your account and associated data at any time by contacting the project maintainer.',
  },
  {
    title: '5. AI Features',
    body: 'AI-generated suggestions, briefings, and insights are informational aids and may be inaccurate. You remain responsible for the decisions you make based on them.',
  },
  {
    title: '6. Availability',
    body: 'The service is provided "as is" without warranties of any kind. We may modify, suspend, or discontinue features at any time and are not liable for interruptions or data loss to the maximum extent permitted by law.',
  },
  {
    title: '7. Changes to These Terms',
    body: 'We may update these terms from time to time. Continued use of TaskGenius after changes are posted constitutes acceptance of the revised terms.',
  },
  {
    title: '8. Contact',
    body: 'Questions about these terms can be raised through the project repository issue tracker.',
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl mx-auto"
      >
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Terms & Conditions</h1>
              <p className="text-xs text-gray-500">Last updated: October 2026</p>
            </div>
          </div>

          <div className="space-y-6">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h2 className="text-sm font-semibold text-gray-900 mb-1.5">{section.title}</h2>
                <p className="text-sm leading-relaxed text-gray-600">{section.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm"
            >
              <ArrowLeft size={16} />
              Back to Registration
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
