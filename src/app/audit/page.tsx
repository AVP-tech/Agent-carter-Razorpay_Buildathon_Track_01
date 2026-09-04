'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageWrapper from '@/components/layout/PageWrapper';

interface AuditLog {
  id: string;
  actionType: string;
  actor: string;
  reasoning?: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;
  guardrailStatus: string;
  guardrailDetails?: any;
  createdAt: string;
}

const FILTERS = [
  'All',
  'CATALOG_SEARCH',
  'UPSELL_OFFER',
  'ORDER_CREATED',
  'GUARDRAIL_CHECK',
  'FAILURE_RECOVERY'
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  } catch (e) {
    return dateString;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PASSED': return 'bg-emerald-500 dark:bg-emerald-400';
    case 'BLOCKED': return 'bg-red-500 dark:bg-red-400';
    case 'WARNING': return 'bg-amber-500 dark:bg-amber-400';
    default: return 'bg-slate-300 dark:bg-slate-600';
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PASSED': return 'badge-success';
    case 'BLOCKED': return 'badge-error';
    case 'WARNING': return 'badge-warning';
    default: return 'badge-info';
  }
};

const getActorBadge = (actor: string) => {
  switch (actor) {
    case 'BUYER_AGENT': return 'badge-info';
    case 'SELLER_AGENT': return 'badge-navy';
    case 'SYSTEM_GUARDRAIL': return 'badge-warning';
    default: return 'badge-info';
  }
};

function LogEntry({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const isRecovery = log.actionType === 'FAILURE_RECOVERY';

  return (
    <motion.div variants={itemVariants} layout className={`card p-4 ${isRecovery ? 'border-l-4 border-l-amber-400 dark:border-l-amber-500' : ''}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <div className={`w-2 h-2 rounded-full ${getStatusColor(log.guardrailStatus)}`} />
        <span className="text-sm font-semibold text-slate-900 dark:text-white">
          {isRecovery ? '🛟 ' : ''}{log.actionType}
        </span>
        <span className={getActorBadge(log.actor)}>{log.actor}</span>
        <span className={getStatusBadge(log.guardrailStatus)}>{log.guardrailStatus}</span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-auto">{formatDate(log.createdAt)}</span>
      </div>

      {log.reasoning && (
        <div className="text-sm text-slate-600 dark:text-slate-300 mt-2 italic">
          {log.reasoning}
        </div>
      )}

      {log.toolName && (
        <div className="font-mono text-xs text-slate-400 dark:text-slate-500 mt-1">
          Tool: {log.toolName}
        </div>
      )}

      {(log.toolInput || log.toolOutput || log.guardrailDetails) && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-rzp-blue cursor-pointer hover:underline focus:outline-none"
          >
            {expanded ? 'Hide Details' : 'Show Details'}
          </button>
          
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-2"
              >
                {log.toolInput && (
                  <div className="mb-2">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">Tool Input</div>
                    <pre className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-xs font-mono overflow-x-auto text-slate-700 dark:text-slate-300">
                      {typeof log.toolInput === 'object' ? JSON.stringify(log.toolInput, null, 2) : log.toolInput}
                    </pre>
                  </div>
                )}
                {log.toolOutput && (
                  <div className="mb-2">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">Tool Output</div>
                    <pre className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-xs font-mono overflow-x-auto text-slate-700 dark:text-slate-300">
                      {typeof log.toolOutput === 'object' ? JSON.stringify(log.toolOutput, null, 2) : log.toolOutput}
                    </pre>
                  </div>
                )}
                {log.guardrailDetails && (
                  <div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">Guardrail Details</div>
                    <pre className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-xs font-mono overflow-x-auto text-slate-700 dark:text-slate-300">
                      {typeof log.guardrailDetails === 'object' ? JSON.stringify(log.guardrailDetails, null, 2) : log.guardrailDetails}
                    </pre>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('All');

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const response = await fetch('/api/agent/audit');
        if (response.ok) {
          const data = await response.json();
          setLogs(data.logs || []);
        }
      } catch (error) {
        console.error('Error fetching audit logs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAuditLogs();
  }, []);

  const filteredLogs = logs.filter((log) => 
    selectedFilter === 'All' || log.actionType === selectedFilter
  );

  const stats = {
    total: logs.length,
    passed: logs.filter(l => l.guardrailStatus === 'PASSED').length,
    blocked: logs.filter(l => l.guardrailStatus === 'BLOCKED').length,
    recovered: logs.filter(l => l.actionType === 'FAILURE_RECOVERY').length,
  };

  return (
    <PageWrapper>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Trail</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Review agent activities, tool executions, and security guardrail checks</p>
        </div>

        {!loading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="metric-card">
              <div className="metric-label text-sm text-slate-500 dark:text-slate-400 font-medium">Total Events</div>
              <div className="metric-value text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label text-sm text-slate-500 dark:text-slate-400 font-medium">Passed</div>
              <div className="metric-value text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.passed}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label text-sm text-slate-500 dark:text-slate-400 font-medium">Blocked</div>
              <div className="metric-value text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.blocked}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label text-sm text-slate-500 dark:text-slate-400 font-medium">Gracefully Recovered</div>
              <div className="metric-value text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.recovered}</div>
            </div>
          </div>
        )}

        <div className="card p-3 flex flex-wrap items-center gap-2 mb-6">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
                selectedFilter === filter
                  ? 'bg-rzp-blue text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3 mt-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-slate-100 dark:bg-white/5 animate-pulse rounded-lg h-16 w-full"></div>
            ))}
          </div>
        ) : filteredLogs.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3 mt-5"
          >
            <AnimatePresence>
              {filteredLogs.map((log, index) => (
                <LogEntry key={log.id || index} log={log} />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {logs.length === 0 
                ? "No audit events recorded yet. Run an agent interaction to generate the audit trail."
                : "No logs match the selected filter."}
            </p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
