"use client";

import { useState } from 'react';
import { Tag, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';

const initialProducts = [
    { id: 1, name: 'Milk 1L', currentPrice: 2.50, suggestedPrice: 2.75, elasticity: 'High', demand: 'High', reason: 'High demand, low stock' },
    { id: 2, name: 'Bread Loaf', currentPrice: 1.80, suggestedPrice: 1.80, elasticity: 'Medium', demand: 'Stable', reason: 'Optimal price point' },
    { id: 3, name: 'Eggs (12pk)', currentPrice: 3.00, suggestedPrice: 3.50, elasticity: 'Low', demand: 'Very High', reason: 'Competitor price increase' },
    { id: 4, name: 'Butter 500g', currentPrice: 4.50, suggestedPrice: 4.20, elasticity: 'High', demand: 'Low', reason: 'Clearance for new batch' },
    { id: 5, name: 'Yogurt Cup', currentPrice: 1.20, suggestedPrice: 1.30, elasticity: 'Medium', demand: 'Rising', reason: 'Seasonal trend' },
];

export default function PricingPage() {
    const [products, setProducts] = useState(initialProducts);

    const applyPrice = (id) => {
        setProducts(products.map(p => {
            if (p.id === id) {
                return { ...p, currentPrice: p.suggestedPrice };
            }
            return p;
        }));
    };

    return (
        <div>
            <div className="header">
                <h1 className="title">Dynamic Pricing</h1>
                <p className="subtitle">Optimize prices based on demand and competition.</p>
            </div>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Price Optimization Suggestions</h3>
                    <button className="btn btn-outline" onClick={() => window.location.reload()}>
                        <RefreshCw size={16} style={{ marginRight: '0.5rem' }} /> Refresh Data
                    </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Product</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Current Price</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Suggested</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Change</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Reasoning</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((item) => {
                                const diff = item.suggestedPrice - item.currentPrice;
                                const percentChange = ((diff / item.currentPrice) * 100).toFixed(1);
                                const isIncrease = diff > 0;
                                const isDecrease = diff < 0;
                                const isNeutral = diff === 0;

                                return (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1rem', fontWeight: '500' }}>{item.name}</td>
                                        <td style={{ padding: '1rem' }}>${item.currentPrice.toFixed(2)}</td>
                                        <td style={{ padding: '1rem', fontWeight: '600' }}>${item.suggestedPrice.toFixed(2)}</td>
                                        <td style={{ padding: '1rem' }}>
                                            {!isNeutral && (
                                                <span className={`badge ${isIncrease ? 'badge-success' : 'badge-danger'}`}>
                                                    {isIncrease ? <ArrowUp size={12} style={{ marginRight: '2px' }} /> : <ArrowDown size={12} style={{ marginRight: '2px' }} />}
                                                    {Math.abs(percentChange)}%
                                                </span>
                                            )}
                                            {isNeutral && <span className="badge" style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>0%</span>}
                                        </td>
                                        <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{item.reason}</td>
                                        <td style={{ padding: '1rem' }}>
                                            {!isNeutral && (
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                                                    onClick={() => applyPrice(item.id)}
                                                >
                                                    Apply
                                                </button>
                                            )}
                                            {isNeutral && <span style={{ color: 'var(--success)', fontSize: '0.875rem' }}>Optimized</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
