"use client";

import { useState, useEffect } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export default function InventoryPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all', '7d', '30d', '60d', '180d'
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/model-api?page=${page}&limit=50&filter=${filter}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setItems(data.predictions);
                    setTotalPages(data.total_pages);
                } else {
                    setError(data.error);
                }
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [page, filter]);

    const handleFilterChange = (newFilter) => {
        setFilter(newFilter);
        setPage(1); // Reset to page 1 when filter changes
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    const getRiskLevel = (item) => {
        if (item.need_restock_7d) return 'Critical';
        if (item.need_restock_30d) return 'High';
        if (item.need_restock_60d) return 'Medium';
        return 'Low';
    };

    const getStatus = (item) => {
        const stock = item.stock_level !== undefined ? item.stock_level : item.stock;
        if (stock === 0) return 'Out of Stock';
        if (item.need_restock_7d) return 'Low';
        if (item.need_restock_30d) return 'Moderate';
        return 'Good';
    };

    const getRestockQty = (item) => {
        switch (filter) {
            case '7d': return item.restock_qty_7d;
            case '30d': return item.restock_qty_30d;
            case '60d': return item.restock_qty_60d;
            case '180d': return item.restock_qty_180d;
            default: return item.restock_qty_7d;
        }
    };

    if (loading && page === 1) {
        return (
            <div>
                <div className="header">
                    <h1 className="title">Inventory Management</h1>
                    <p className="subtitle">Monitor stock levels and prevent shortages.</p>
                </div>

                {/* Skeleton Filter Controls */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="skeleton" style={{ width: '100px', height: '40px', borderRadius: '8px' }}></div>
                    ))}
                </div>

                {/* Skeleton Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="card" style={{ height: '200px' }}>
                            <div className="skeleton" style={{ height: '24px', width: '60%', marginBottom: '1rem' }}></div>
                            <div className="skeleton" style={{ height: '16px', width: '40%', marginBottom: '2rem' }}></div>
                            <div className="skeleton" style={{ height: '40px', width: '100%' }}></div>
                        </div>
                    ))}
                </div>

                {/* Skeleton Table */}
                <div className="card">
                    <div className="skeleton" style={{ height: '32px', width: '200px', marginBottom: '1.5rem' }}></div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <th key={i} style={{ padding: '1rem' }}>
                                            <div className="skeleton" style={{ height: '20px', width: '80%' }}></div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[1, 2, 3, 4, 5].map((row) => (
                                    <tr key={row} style={{ borderBottom: '1px solid var(--border)' }}>
                                        {[1, 2, 3, 4, 5, 6].map((col) => (
                                            <td key={col} style={{ padding: '1rem' }}>
                                                <div className="skeleton" style={{ height: '20px', width: '100%' }}></div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }
    if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

    return (
        <div>
            <div className="header">
                <h1 className="title">Inventory Management</h1>
                <p className="subtitle">Monitor stock levels and prevent shortages.</p>
            </div>

            {/* Filter Controls */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {['all', '7d', '30d', '60d', '180d'].map((f) => (
                    <button
                        key={f}
                        onClick={() => handleFilterChange(f)}
                        className={`btn ${filter === f ? 'btn-primary' : 'btn-outline'}`}
                        style={{ whiteSpace: 'nowrap' }}
                    >
                        {f === 'all' ? 'All Stock' : `Restock in ${f}`}
                    </button>
                ))}
            </div>

            {/* Critical Items Cards (Top 3 from current page) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {items.slice(0, 3).map((item) => (
                    <div key={item.item_id} className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>{item.name || `Item ${item.item_id}`}</h3>
                                <span className="badge badge-danger">Restock Needed</span>
                            </div>
                            <AlertTriangle color="var(--danger)" />
                        </div>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            Current Stock: <strong>{item.stock_level || item.stock}</strong>
                            <br />
                            {filter === 'all' ? (
                                <>Predicted Demand (7d): {item.pred_7d.toFixed(1)}</>
                            ) : (
                                <>Predicted Demand ({filter}): {item[`pred_${filter}`]?.toFixed(1)}</>
                            )}
                        </p>
                        <button className="btn btn-primary" style={{ width: '100%' }}>
                            Order Restock ({getRestockQty(item).toFixed(0)}) <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="card">
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                    {filter === 'all' ? 'All Products' : `Products Requiring Restock within ${filter}`}
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Product Name</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Stock Level</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Status</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Risk Level</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Restock Qty ({filter === 'all' ? '7d' : filter})</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.item_id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem', fontWeight: '500' }}>{item.name || `Item ${item.item_id}`}</td>
                                    <td style={{ padding: '1rem' }}>{item.stock_level || item.stock}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span className={`badge ${getStatus(item) === 'Low' || getStatus(item) === 'Out of Stock' ? 'badge-danger' :
                                            getStatus(item) === 'Moderate' ? 'badge-warning' : 'badge-success'
                                            }`}>
                                            {getStatus(item)}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem' }}>{getRiskLevel(item)}</td>
                                    <td style={{ padding: '1rem' }}>
                                        {getRestockQty(item).toFixed(0)}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                                            Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                    <button
                        className="btn btn-outline"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                    >
                        Previous
                    </button>
                    <span style={{ color: 'var(--text-muted)' }}>
                        Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                    </span>
                    <button
                        className="btn btn-outline"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
