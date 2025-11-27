"use client";

import { AlertTriangle, CheckCircle, Package, ArrowRight } from 'lucide-react';

const inventoryData = [
    { id: 1, name: 'Milk 1L', stock: 12, threshold: 20, status: 'Low', risk: 'High' },
    { id: 2, name: 'Bread Loaf', stock: 45, threshold: 15, status: 'Good', risk: 'Low' },
    { id: 3, name: 'Eggs (12pk)', stock: 8, threshold: 10, status: 'Critical', risk: 'Critical' },
    { id: 4, name: 'Butter 500g', stock: 30, threshold: 10, status: 'Good', risk: 'Low' },
    { id: 5, name: 'Yogurt Cup', stock: 15, threshold: 25, status: 'Low', risk: 'Medium' },
];

export default function InventoryPage() {
    return (
        <div>
            <div className="header">
                <h1 className="title">Inventory Management</h1>
                <p className="subtitle">Monitor stock levels and prevent shortages.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {inventoryData.filter(i => i.risk === 'Critical' || i.risk === 'High').map((item) => (
                    <div key={item.id} className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>{item.name}</h3>
                                <span className="badge badge-danger">Restock Needed</span>
                            </div>
                            <AlertTriangle color="var(--danger)" />
                        </div>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            Current Stock: <strong>{item.stock}</strong> (Threshold: {item.threshold})
                        </p>
                        <button className="btn btn-primary" style={{ width: '100%' }}>
                            Order Restock <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="card">
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>All Products</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Product Name</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Stock Level</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Status</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Risk Level</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inventoryData.map((item) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem', fontWeight: '500' }}>{item.name}</td>
                                    <td style={{ padding: '1rem' }}>{item.stock}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span className={`badge ${item.status === 'Critical' ? 'badge-danger' :
                                                item.status === 'Low' ? 'badge-warning' : 'badge-success'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem' }}>{item.risk}</td>
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
            </div>
        </div>
    );
}
