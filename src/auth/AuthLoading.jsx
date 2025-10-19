import React from 'react';

export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
        <div className="mx-auto mb-4 h-12 w-auto" style={{display:'inline-block'}}>
          {/* Inline simple logo SVG to avoid external asset 404 on deploy */}
          <svg width="96" height="48" viewBox="0 0 96 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <rect width="96" height="48" rx="8" fill="#4f46e5" />
            <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#fff" fontFamily="Inter, Arial, sans-serif" fontSize="14">RTx</text>
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">RealTimeRx</h2>
        <p className="text-sm text-gray-600 mb-6">Redirecting to secure login&hellip;</p>
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
        </div>
        <p className="text-xs text-gray-400 mt-4">If you are not redirected, please click &ldquo;Sign in&rdquo; on the Hosted UI.</p>
      </div>
    </div>
  );
}
