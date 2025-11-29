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

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(URL.createObjectURL(file));   // Preview
            setImageFile(file);                    // File upload
            setResult(null);
            setError(null);
        }
    };

    const processImage = async () => {
        if (!imageFile) return;

        setLoading(true);
        setError(null);
        setResult(null);

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

            setResult({
                text: data.extracted_text,
                status: "Success",
            });

        } catch (err) {
            console.error(err);
            setError("Could not connect to backend.");
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
                    {image && (
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

                    {/* RESULT */}
                    {result && (
                        <div style={{ marginTop: '2rem' }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Extracted Text</label>
                                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--primary)' }}>
                                    {result.text || "No Text Found"}
                                </div>
                            </div>

                            <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Check size={20} />
                                <span>Text extracted successfully!</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
