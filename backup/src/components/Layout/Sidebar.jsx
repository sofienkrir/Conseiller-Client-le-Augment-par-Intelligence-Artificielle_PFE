import React from 'react';

const recentItems = [
  { icon: '💰', title: 'Balance Check', time: '2 min ago' },
  { icon: '🏦', title: 'Loan Query', time: '1 hour ago' },
  { icon: '📝', title: 'Opening a New Account', time: '3 hours ago' },
  { icon: '🔄', title: 'Loan connections', time: 'Yesterday' },
  { icon: '💰', title: 'Balance Check', time: 'Yesterday' },
];

const Sidebar = () => {
  return (
    <aside className="w-80 bg-white m-4 rounded-2xl shadow-lg p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 px-2">Recent</h3>
      <div className="space-y-2">
        {recentItems.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-all"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">
              {item.icon}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-800">{item.title}</p>
              <p className="text-xs text-gray-500">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;