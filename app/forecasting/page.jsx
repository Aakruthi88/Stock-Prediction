"use client";

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';

const initialData = [
    { day: 'Mon', actual: 120, predicted: 125 },
    { day: 'Tue', actual: 132, predicted: 130 },
    { day: 'Wed', actual: 101, predicted: 105 },
    { day: 'Thu', actual: 134, predicted: 140 },
    { day: 'Fri', actual: 90, predicted: 95 },
    { day: 'Sat', actual: 230, predicted: 220 },
    { day: 'Sun', actual: 210, predicted: 215 },
];

export default function ForecastingPage() {
    const [horizon, setHorizon] = useState(7);
    const [product, setProduct] = useState('Milk 1L');

    return (
        <div>
            <div className="header">
                <h1 className="title">Demand Forecasting</h1>
                <p className="subtitle">Predict future demand to optimize inventory.</p>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Product</label>
                        <select
                            className="input"
                            value={product}
                            onChange={(e) => setProduct(e.target.value)}
                        >
                            <option>Milk 1L</option>
                            <option>Bread Loaf</option>
                            <option>Eggs (12pk)</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Forecast Horizon</label>
                        <select
                            className="input"
                            value={horizon}
                            onChange={(e) => setHorizon(Number(e.target.value))}
                        >
                            <option value={3}>3 Days</option>
                            <option value={7}>7 Days</option>
                            <option value={14}>14 Days</option>
                        </select>
                    </div>
                </div>

                <div style={{ height: '400px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={initialData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="day" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--card-bg)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="actual" stroke="var(--primary)" strokeWidth={2} name="Actual Sales" />
                            <Line type="monotone" dataKey="predicted" stroke="var(--success)" strokeWidth={2} strokeDasharray="5 5" name="Predicted Demand" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.5rem', backgroundColor: '#e0e7ff', borderRadius: '0.5rem', color: 'var(--primary)' }}>
                            <TrendingUp size={20} />
                        </div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Trend Analysis</h3>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Demand for <strong>{product}</strong> is trending upwards by <strong>5%</strong> compared to last week. Consider increasing stock for the weekend.
                    </p>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.5rem', backgroundColor: '#d1fae5', borderRadius: '0.5rem', color: 'var(--success)' }}>
                            <Calendar size={20} />
                        </div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Next Restock</h3>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Based on current velocity, you should restock <strong>{product}</strong> by <strong>Friday</strong> to avoid stockouts.
                    </p>
                </div>
            </div>
        </div>
    );
}
