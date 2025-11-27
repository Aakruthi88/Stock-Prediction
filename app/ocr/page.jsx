"use client";

import { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { Upload, ScanLine, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function OCRPage() {
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(URL.createObjectURL(file));
            setResult(null);
            setError(null);
        }
    };

    const extractDate = (text) => {
        // Regex to find dates in various formats (DD/MM/YYYY, MM/YYYY, YYYY-MM-DD, etc.)
        const datePattern = /\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{2,4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{2,4})\b/gi;
        const matches = text.match(datePattern);
        return matches ? matches[0] : null;
    };

    const processImage = async () => {
        if (!image) return;

        setLoading(true);
        setError(null);

        try {
            const { data: { text } } = await Tesseract.recognize(
                image,
                'eng',
                { logger: m => console.log(m) }
            );

            const extractedDate = extractDate(text);

            if (extractedDate) {
                setResult({
                    text: text,
                    date: extractedDate,
                    status: 'Success'
                });
            } else {
                setResult({
                    text: text,
                    date: null,
                    status: 'No Date Found'
                });
                setError("Could not detect a valid expiry date format. Please ensure the image is clear.");
            }

        } catch (err) {
            console.error(err);
            setError("Failed to process image. Please try again.");
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

                    <div style={{ marginTop: '1.5rem' }}>
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            disabled={!image || loading}
                            onClick={processImage}
                        >
                            {loading ? <><Loader2 className="animate-spin" size={20} style={{ marginRight: '0.5rem' }} /> Processing...</> : <><ScanLine size={20} style={{ marginRight: '0.5rem' }} /> Extract Expiry Date</>}
                        </button>
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Extraction Results</h3>

                    {!result && !error && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)', textAlign: 'center' }}>
                            <ScanLine size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                            <p>Results will appear here after processing.</p>
                        </div>
                    )}

                    {error && (
                        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '0.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                            <AlertCircle size={20} style={{ flexShrink: 0 }} />
                            <p>{error}</p>
                        </div>
                    )}

                    {result && (
                        <div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Detected Expiry Date</label>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: result.date ? 'var(--primary)' : 'var(--text-muted)' }}>
                                    {result.date || "Not Found"}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Raw Text Extracted</label>
                                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-soft)', borderRadius: '0.5rem', fontSize: '0.875rem', maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                                    {result.text}
                                </div>
                            </div>

                            {result.date && (
                                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Check size={20} />
                                    <span>Date successfully extracted!</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
