"use client";

import { useState, useEffect } from 'react';
import { Tag, ArrowUp, ArrowDown, RefreshCw, Loader2 } from 'lucide-react';

export default function PricingPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = () => {
        setLoading(true);
        fetch('/api/model-api?limit=100')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const processed = data.predictions.map(item => {
                        // Simulate current price if missing (random between $2 and $20)
                        const currentPrice = item.price || parseFloat((Math.random() * 18 + 2).toFixed(2));

                        let suggestedPrice = currentPrice;
                        let reason = "Stable market conditions";
                        let elasticity = "Medium";

                        // Pricing Logic
                        if (item.need_restock_7d) {
                            suggestedPrice = currentPrice * 1.10; // +10%
                            reason = "High demand, low stock availability";
                            elasticity = "Low";
                        } else if (item.days_left > 60) {
                            suggestedPrice = currentPrice * 0.90; // -10%
                            reason = "Excess inventory, clearance recommended";
                            elasticity = "High";
                        }

                        return {
                            ...item,
                            currentPrice,
                            suggestedPrice,
                            reason,
                            elasticity
                        };
                    });
                    setProducts(processed);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    const applyPrice = (id) => {
        setProducts(products.map(p => {
            if (p.item_id === id) {
                return { ...p, currentPrice: p.suggestedPrice };
            }
            return p;
        }));
        // Here you would typically make an API call to update the price in the DB
    };

    if (loading) return <div className="p-8 text-center">Loading pricing data...</div>;

    return (
        <div>
            <div className="header">
                <h1 className="title">Dynamic Pricing</h1>
                <p className="subtitle">Optimize prices based on demand and competition.</p>
            </div>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Price Optimization Suggestions</h3>
                    <button className="btn btn-outline" onClick={fetchData} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" size={16} style={{ marginRight: '0.5rem' }} /> : <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />}
                        Refresh Data
                    </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Product</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Stock</th>
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
                                const isIncrease = diff > 0.01;
                                const isDecrease = diff < -0.01;
                                const isNeutral = !isIncrease && !isDecrease;

                                return (
                                    <tr key={item.item_id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1rem', fontWeight: '500' }}>{item.name || `Item ${item.item_id}`}</td>
                                        <td style={{ padding: '1rem' }}>{item.stock}</td>
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
                                                    onClick={() => applyPrice(item.item_id)}
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
