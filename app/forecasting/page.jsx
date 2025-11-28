"use client";

import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar, Search, ChevronDown } from 'lucide-react';

export default function ForecastingPage() {
    const [items, setItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(true);

    // Search & Dropdown State
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [displayLimit, setDisplayLimit] = useState(20);
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetch('/api/model-api?limit=10000')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.predictions.length > 0) {
                    setItems(data.predictions);
                    const firstItem = data.predictions[0];
                    setSelectedItem(firstItem);
                    setSearchQuery(firstItem.name || `Item ${firstItem.item_id}`);
                }
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredItems = items.filter(item => {
        const name = item.name || `Item ${item.item_id}`;
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollTop + clientHeight >= scrollHeight - 10) {
            setDisplayLimit(prev => prev + 20);
        }
    };

    const handleSelect = (item) => {
        setSelectedItem(item);
        setSearchQuery(item.name || `Item ${item.item_id}`);
        setIsOpen(false);
        console.log(item)
        console.log(item.item_popularity_score);
    };

    if (loading) return (
        <div>
            <div className="header">
                <h1 className="title">Demand Forecasting</h1>
                <p className="subtitle">Predict future demand to optimize inventory.</p>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <div className="skeleton" style={{ height: '14px', width: '60px', marginBottom: '0.5rem' }}></div>
                    <div className="skeleton" style={{ height: '40px', width: '100%' }}></div>
                </div>

                <div style={{ height: '400px', width: '100%', position: 'relative' }}>
                    {/* Skeleton Graph Axis */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: '10px', width: '100%' }}></div>)}
                    </div>
                    {/* Skeleton Graph Area */}
                    <div className="skeleton" style={{ marginLeft: '50px', height: '100%', width: 'calc(100% - 50px)', borderRadius: '4px' }}></div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {[1, 2].map((i) => (
                    <div key={i} className="card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div className="skeleton skeleton-circle"></div>
                            <div className="skeleton" style={{ height: '20px', width: '150px' }}></div>
                        </div>
                        <div className="skeleton" style={{ height: '14px', width: '100%', marginBottom: '0.5rem' }}></div>
                        <div className="skeleton" style={{ height: '14px', width: '80%' }}></div>
                    </div>
                ))}
            </div>
        </div>
    );
    if (!selectedItem) return <div className="p-8 text-center">No data available.</div>;

    // Prepare chart data: Cumulative Demand over time
    const chartData = [
        { day: 'Today', demand: 0, stock: selectedItem.stock },
        { day: '7 Days', demand: selectedItem.pred_7d, stock: selectedItem.stock },
        { day: '30 Days', demand: selectedItem.pred_30d, stock: selectedItem.stock },
        { day: '60 Days', demand: selectedItem.pred_60d, stock: selectedItem.stock },
        { day: '180 Days', demand: selectedItem.pred_180d, stock: selectedItem.stock },
    ];

    return (
        <div>
            <div className="header">
                <h1 className="title">Demand Forecasting</h1>
                <p className="subtitle">Predict future demand to optimize inventory.</p>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, position: 'relative' }} ref={dropdownRef}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Product</label>

                        {/* Custom Searchable Dropdown */}
                        <div
                            style={{ position: 'relative', cursor: 'pointer' }}
                        >
                            <input
                                type="text"
                                className="input"
                                placeholder="Search product..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setIsOpen(true);
                                    setDisplayLimit(20);
                                }}
                                onClick={() => {
                                    setIsOpen(true);
                                    setSearchQuery(''); // Clear query on click to show all or allow fresh search
                                }}
                                style={{ paddingRight: '2.5rem', width: '100%' }}
                            />
                            <div
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
                            >
                                {isOpen ? <Search size={18} /> : <ChevronDown size={18} />}
                            </div>
                        </div>

                        {isOpen && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    maxHeight: '300px', // Approx 10 items (assuming ~30px per item)
                                    overflowY: 'auto',
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '0.5rem',
                                    marginTop: '0.25rem',
                                    zIndex: 50,
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                                onScroll={handleScroll}
                            >
                                {filteredItems.length > 0 ? (
                                    filteredItems.slice(0, displayLimit).map((item, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => handleSelect(item)}
                                            style={{
                                                padding: '0.75rem 1rem',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid var(--border)',
                                                backgroundColor: (selectedItem && (selectedItem.item_id === item.item_id)) ? '#f3f4f6' : 'transparent',
                                                transition: 'background-color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = (selectedItem && (selectedItem.item_id === item.item_id)) ? '#f3f4f6' : 'transparent'}
                                        >
                                            <div style={{ fontWeight: '500' }}>{item.name || `Item ${item.item_id}`}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stock: {item.stock}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No products found.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ height: '400px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="day" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" label={{ value: 'Units', angle: -90, position: 'insideLeft' }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--card-bg)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="demand" stroke="var(--primary)" strokeWidth={2} name="Cumulative Predicted Demand" />
                            <Line type="monotone" dataKey="stock" stroke="var(--warning)" strokeWidth={2} strokeDasharray="5 5" name="Current Stock Level" />
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
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Demand Velocity</h3>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Predicted demand for <strong>{selectedItem.name || selectedItem.item_id}</strong> is approximately <strong>{ Math.round(selectedItem.daily_demand_final !== undefined ? selectedItem.daily_demand_final : selectedItem.pred_30d / 30
) }
</strong> units/day over the next month.
                    </p>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.5rem', backgroundColor: selectedItem.days_left < 7 ? '#fee2e2' : '#d1fae5', borderRadius: '0.5rem', color: selectedItem.days_left < 7 ? 'var(--danger)' : 'var(--success)' }}>
                            <Calendar size={20} />
                        </div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Stock Coverage</h3>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Current stock ({selectedItem.stock}) is expected to last <strong>{selectedItem.days_left > 9000 ? 'Indefinitely' : `${Math.round(selectedItem.days_left)} days`}</strong> based on current demand.
                        {selectedItem.need_restock_7d && <span style={{ color: 'var(--danger)', display: 'block', marginTop: '0.5rem', fontWeight: 'bold' }}>Restock recommended immediately!</span>}
                    </p>
                </div>
            </div>
        </div>
    );
}
