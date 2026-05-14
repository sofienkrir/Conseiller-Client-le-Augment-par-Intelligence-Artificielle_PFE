import React from 'react';

const RecentItem = ({ icon, title, time }) => (
  <div className="recent-item">
    <div className="recent-icon">{icon}</div>
    <div className="recent-text">
      <div className="recent-title">{title}</div>
      <div className="recent-time">{time}</div>
    </div>
  </div>
);

const RecentList = () => (
  <div className="recent-list">
    <RecentItem icon="💰" title="Balance Check" time="Recent" />
    <RecentItem icon="🏦" title="Loan Query" time="Recent" />
    <RecentItem icon="📝" title="Opening a New Account" time="Recent" />
    <RecentItem icon="🔄" title="Loan connections" time="Recent" />
    <RecentItem icon="💰" title="Balance Check" time="Recent" />
  </div>
);

export default RecentList;
