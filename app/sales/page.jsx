"use client";

import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, User, Phone, Search, ChevronDown, CheckCircle, AlertCircle } from 'lucide-react';

export default function SalesPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);

    // Form State
    const [selectedItem, setSelectedItem] = useState(null);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [quantity, setQuantity] = useState(1);

    // Search & Dropdown State
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [displayLimit, setDisplayLimit] = useState(20);
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetch('/api/model-api?limit=10000')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setItems(data.predictions);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
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
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedItem || !customerName || !customerPhone || quantity < 1) {
            setMessage({ type: 'error', text: 'Please fill in all fields correctly.' });
            return;
        }

        setSubmitting(true);
        setMessage(null);

        try {
            const res = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    item_id: selectedItem.item_id,
                    item_name: selectedItem.name,
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    quantity: parseInt(quantity),
                    price: selectedItem.price || 0 // Assuming price might be in item data, else 0
                }),
            });

            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: 'Sale recorded successfully!' });
                // Reset form
                setSelectedItem(null);
                setSearchQuery('');
                setCustomerName('');
                setCustomerPhone('');
                setQuantity(1);
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to record sale.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading products...</div>;

    return (
        <div>
            <div className="header">
                <h1 className="title">Record New Sale</h1>
                <p className="subtitle">Enter customer details and purchased items.</p>
            </div>

            <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <form onSubmit={handleSubmit}>
                    {/* Product Selection */}
                    <div style={{ marginBottom: '1.5rem' }} ref={dropdownRef}>
                        <label className="label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Product</label>
                        <div style={{ position: 'relative' }}>
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
                                    onClick={() => setIsOpen(true)}
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
                                        maxHeight: '300px',
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

                    {/* Quantity */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Quantity</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="number"
                                min="1"
                                className="input"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                style={{ width: '100%' }}
                            />
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Units</span>
                        </div>
                    </div>

                    {/* Customer Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                        <div>
                            <label className="label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Customer Name</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="John Doe"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Phone Number</label>
                            <div style={{ position: 'relative' }}>
                                <Phone size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="tel"
                                    className="input"
                                    placeholder="+1 234 567 890"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Message Alert */}
                    {message && (
                        <div style={{
                            padding: '1rem',
                            borderRadius: '0.5rem',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                            color: message.type === 'success' ? 'var(--success)' : 'var(--danger)'
                        }}>
                            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                            <span>{message.text}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                        disabled={submitting}
                    >
                        {submitting ? 'Recording Sale...' : (
                            <>
                                <ShoppingCart size={20} /> Record Sale
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
