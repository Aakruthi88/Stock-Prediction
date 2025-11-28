"use client";

import { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, DollarSign, Package } from 'lucide-react';

export default function Home() {
  const [stats, setStats] = useState([
    { title: "Total Revenue", value: "$12,450", change: "+15%", icon: DollarSign, color: "var(--primary)", bg: "#e0e7ff" },
    { title: "Low Stock Items", value: "...", change: "...", icon: AlertTriangle, color: "var(--warning)", bg: "#fef3c7" },
    { title: "Predicted Demand (7d)", value: "...", change: "...", icon: TrendingUp, color: "var(--success)", bg: "#d1fae5" },
    { title: "Active Products", value: "...", change: "0%", icon: Package, color: "var(--text-muted)", bg: "#f3f4f6" }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/model-api?limit=10000') // Fetch all for stats
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const items = data.predictions;
          const totalItems = data.total_items || items.length;
          const lowStockCount = items.filter(i => i.need_restock_7d).length;
          const totalDemand7d = items.reduce((sum, i) => sum + i.pred_7d, 0);

          setStats([
            {
              title: "Total Revenue",
              value: "$12,450", // Static for now
              change: "+15%",
              icon: DollarSign,
              color: "var(--primary)",
              bg: "#e0e7ff"
            },
            {
              title: "Low Stock Items",
              value: lowStockCount.toString(),
              change: `${((lowStockCount / totalItems) * 100).toFixed(1)}% of total`,
              icon: AlertTriangle,
              color: "var(--warning)",
              bg: "#fef3c7"
            },
            {
              title: "Predicted Demand (7d)",
              value: `${Math.round(totalDemand7d).toLocaleString()} Units`,
              change: "Next 7 Days",
              icon: TrendingUp,
              color: "var(--success)",
              bg: "#d1fae5"
            },
            {
              title: "Active Products",
              value: totalItems.toString(),
              change: "In Database",
              icon: Package,
              color: "var(--text-muted)",
              bg: "#f3f4f6"
            }
          ]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch stats:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <div className="header">
        <h1 className="title">Dashboard Overview</h1>
        <p className="subtitle">Welcome back, Store Manager.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                padding: '1rem',
                borderRadius: '50%',
                backgroundColor: stat.bg,
                color: stat.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon size={24} />
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{stat.title}</p>
                {loading ? (
                  <div style={{ height: '2rem', width: '4rem', background: '#eee', borderRadius: '4px', margin: '0.5rem 0' }} />
                ) : (
                  <h3 style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stat.value}</h3>
                )}
                <span style={{ fontSize: '0.75rem', color: stat.change.includes('+') || stat.change.includes('Next') || stat.change.includes('In') ? 'var(--text-muted)' : 'var(--danger)' }}>
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Recent Activity</h3>
        <p style={{ color: 'var(--text-muted)' }}>
          {loading ? "Loading system data..." : "System updated with latest inventory predictions."}
        </p>
      </div>
    </div>
  );
}
