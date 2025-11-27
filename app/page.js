"use client";

import { TrendingUp, AlertTriangle, DollarSign, Package } from 'lucide-react';

export default function Home() {
  const stats = [
    {
      title: "Total Revenue",
      value: "$12,450",
      change: "+15%",
      icon: DollarSign,
      color: "var(--primary)",
      bg: "#e0e7ff"
    },
    {
      title: "Low Stock Items",
      value: "23",
      change: "+5",
      icon: AlertTriangle,
      color: "var(--warning)",
      bg: "#fef3c7"
    },
    {
      title: "Predicted Demand",
      value: "1,205 Units",
      change: "+8%",
      icon: TrendingUp,
      color: "var(--success)",
      bg: "#d1fae5"
    },
    {
      title: "Active Products",
      value: "450",
      change: "0%",
      icon: Package,
      color: "var(--text-muted)",
      bg: "#f3f4f6"
    }
  ];

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
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stat.value}</h3>
                <span style={{ fontSize: '0.75rem', color: stat.change.includes('+') ? 'var(--success)' : 'var(--danger)' }}>
                  {stat.change} from last week
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Recent Activity</h3>
        <p style={{ color: 'var(--text-muted)' }}>System initialized. Waiting for data inputs...</p>
      </div>
    </div>
  );
}
