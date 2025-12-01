"use client";

import { useState, useRef } from 'react';
import { Upload, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function OCRPage() {
    const [image, setImage] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const [productName, setProductName] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [category, setCategory] = useState('General');
    const [quantity, setQuantity] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [holdingCost, setHoldingCost] = useState('');
    const [handlingCost, setHandlingCost] = useState('');
    const [showForm, setShowForm] = useState(false);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(URL.createObjectURL(file));   // Preview
            setImageFile(file);                    // File upload
            setResult(null);
            setError(null);
            setShowForm(false);
            setProductName('');
            setExpiryDate('');
            setCategory('General');
            setQuantity('');
            setUnitPrice('');
            setHoldingCost('');
            setHandlingCost('');
        }
    };

    const processImage = async () => {
        if (!imageFile) return;

        setLoading(true);
        setError(null);
        setResult(null);
        setShowForm(false);

        const formData = new FormData();
        formData.append("image", imageFile);

        try {
            const res = await fetch("http://localhost:5000/extract", {
                method: "POST",
                body: formData
            });

            const data = await res.json();

            if (!data.success) {
                setError(data.error || "Failed to extract text.");
                return;
            }

            let geminiAnalysis = null;
            if (data.extracted_text) {
                try {
                    const geminiRes = await fetch("/api/gemini", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: data.extracted_text })
                    });
                    const geminiData = await geminiRes.json();
                    if (geminiData.result) {
                        geminiAnalysis = geminiData.result;

                        // Parse format: [name],[expiry_date]
                        // We'll remove brackets if present and split by comma
                        const cleanResult = geminiData.result.replace(/[\[\]]/g, '');
                        const parts = cleanResult.split(',');

                        if (parts.length >= 1) setProductName(parts[0].trim());
                        if (parts.length >= 2) setExpiryDate(parts[1].trim());

                        setShowForm(true);
                    }
                } catch (geminiErr) {
                    console.error("Gemini API Error:", geminiErr);
                }
            }

            setResult({
                text: data.extracted_text,
                analysis: geminiAnalysis,
                status: "Success",
            });

        } catch (err) {
            console.error(err);
            setError("Could not connect to backend.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!productName || !quantity || !unitPrice || !holdingCost || !handlingCost) {
            alert("Please fill in all required fields.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/inventory/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: productName,
                    category,
                    expiryDate,
                    quantity: parseInt(quantity),
                    unitPrice: parseFloat(unitPrice),
                    holdingCost: parseFloat(holdingCost),
                    handlingCost: parseFloat(handlingCost)
                })
            });

            const data = await res.json();

            if (data.success) {
                alert(`Saved successfully!\nProduct: ${productName}\nStock Level: ${data.item.stock_level}`);
                setShowForm(false);
                setResult(null);
                setImage(null);
                setImageFile(null);
            } else {
                alert("Failed to save: " + (data.error || "Unknown error"));
            }
        } catch (err) {
            console.error(err);
            alert("Error saving item.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="header">
                <h1 className="title">Expiry Date Scanner</h1>
                <p className="subtitle">Upload product images to automatically extract expiry dates.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <div className="card">
                    <div
                        style={{
                            border: '2px dashed var(--border)',
                            borderRadius: '1rem',
                            padding: '3rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            backgroundColor: 'var(--bg-soft)',
                            transition: 'border-color 0.2s'
                        }}
                        onClick={() => fileInputRef.current.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />

                        {image ? (
                            <img src={image} alt="Preview" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '0.5rem' }} />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                                <Upload size={48} />
                                <p>Click to upload or drag and drop</p>
                                <span style={{ fontSize: '0.75rem' }}>JPG, PNG supported</span>
                            </div>
                        )}
                    </div>

                    {/* Extract Button */}
                    {image && !showForm && (
                        <button
                            onClick={processImage}
                            disabled={loading}
                            style={{
                                marginTop: '1.5rem',
                                width: '100%',
                                padding: '0.8rem',
                                backgroundColor: 'var(--primary)',
                                color: 'white',
                                borderRadius: '0.5rem',
                                fontWeight: 'bold',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : "Extract Text"}
                        </button>
                    )}

                    {/* ERROR */}
                    {error && (
                        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '0.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginTop: '1rem' }}>
                            <AlertCircle size={20} />
                            <p>{error}</p>
                        </div>
                    )}

                    {/* RESULT FORM */}
                    {showForm && (
                        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>Verify Details</h3>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Product Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Category</label>
                                <select
                                    className="input"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    style={{ width: '100%' }}
                                >
                                    <option value="Pharma">Pharma</option>
                                    <option value="Automotive">Automotive</option>
                                    <option value="Electronics">Electronics</option>
                                    <option value="Groceries">Groceries</option>
                                    <option value="Apparel">Apparel</option>
                                    <option value="General">General</option>
                                    <option value="Others">Others</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Expiry Date</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={expiryDate}
                                    onChange={(e) => setExpiryDate(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Quantity Added</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        style={{ width: '100%' }}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Unit Price</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={unitPrice}
                                        onChange={(e) => setUnitPrice(e.target.value)}
                                        style={{ width: '100%' }}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Holding Cost / Unit / Day</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={holdingCost}
                                        onChange={(e) => setHoldingCost(e.target.value)}
                                        style={{ width: '100%' }}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Handling Cost / Unit</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={handlingCost}
                                        onChange={(e) => setHandlingCost(e.target.value)}
                                        style={{ width: '100%' }}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '0.8rem',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    borderRadius: '0.5rem',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    opacity: loading ? 0.7 : 1
                                }}
                            >
                                {loading ? <Loader2 size={20} className="animate-spin" /> : <><Check size={20} /> Confirm & Save</>}
                            </button>
                        </div>
                    )}
                </div>


            </div>
        </div>
    );
}
