import React from 'react';

export default function PostLogout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">You are signed out</h2>
        <p className="text-sm text-gray-600 mb-6">You have been signed out of RealTimeRx. For security, tokens were not persisted.</p>
        <a href="/" className="px-4 py-2 bg-indigo-600 text-white rounded">Return to home</a>
      </div>
    </div>
  );
}
