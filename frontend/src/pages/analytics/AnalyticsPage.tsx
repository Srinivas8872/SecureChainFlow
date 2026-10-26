import React from 'react';
import { AnalyticsDashboard } from '../../components/analytics/AnalyticsDashboard';

/**
 * Standalone platform-wide analytics page (accessible from sidebar).
 * Renders the AnalyticsDashboard without a per-batch risk panel.
 */
export const AnalyticsPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 py-2 px-1">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Analytics</h1>
        <p className="text-sm text-slate-400 mt-1">
          Real-time supply chain intelligence, blockchain commit rates, and AI anomaly risk overview.
        </p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
};

export default AnalyticsPage;
