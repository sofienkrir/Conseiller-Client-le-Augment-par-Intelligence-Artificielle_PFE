import React from 'react';

const tips = [
  'Ask about a loan',
  'Branch locator',
  'Update personal info',
  'Block card',
];

const QuickTips = () => {
  return (
    <aside className="w-80 bg-white m-4 rounded-2xl shadow-lg p-4 flex flex-col">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 px-2">Voice Quick-tips</h3>
      <div className="space-y-2 flex-1">
        {tips.map((tip, index) => (
          <div
            key={index}
            className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-all text-gray-700"
          >
            {tip}
          </div>
        ))}
      </div>
      
      <button className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2">
        <span>🎤</span>
        START VOICE SESSION
      </button>
    </aside>
  );
};

export default QuickTips;