import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Layers, Sparkles, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';

interface ProductItem {
  id: string;
  name: string;
  category: string;
  sku?: string;
}

export const NewBatchPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [productId, setProductId] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [source, setSource] = useState('');
  const [quantity, setQuantity] = useState<number>(100);
  const [unit, setUnit] = useState('KG');
  const [manufactureDate, setManufactureDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await api.get<ProductItem[]>('/products');
        setProducts(data);
        if (data.length > 0) {
          setProductId(data[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load products');
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, []);

  const handleGenerateBatchCode = () => {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const year = new Date().getFullYear();
    setBatchCode(`SCF-${year}-${randomSuffix}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (expiryDate && new Date(expiryDate) < new Date(manufactureDate)) {
      setError('Expiry date must be on or after the manufacture date.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post<{ id: string }>('/batches', {
        batchCode: batchCode.trim().toUpperCase(),
        productId,
        source: source.trim(),
        quantity: Number(quantity),
        unit: unit.trim().toUpperCase(),
        manufactureDate: new Date(manufactureDate).toISOString(),
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
      });

      navigate(`/batches/${response.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to register batch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/batches"
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-sky-400" />
            <span>Register New Batch</span>
          </h1>
          <p className="text-sm text-slate-400">
            Initialize a lot tracking record and compute its tamper-evident canonical digest.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {loadingProducts ? (
        <div className="py-12 text-center text-slate-400">Loading catalog...</div>
      ) : products.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <h3 className="text-base font-semibold text-white">No Product Templates Available</h3>
          <p className="text-sm text-slate-400">
            You must create at least one Product Template before you can register batches.
          </p>
          <Link to="/products">
            <Button variant="primary">Create Product Template</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          {/* Product Template Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="product">
              Product Template *
            </label>
            <select
              id="product"
              required
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category}) {p.sku ? `[${p.sku}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Code with generator button */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300" htmlFor="code">
                Unique Batch Code *
              </label>
              <button
                type="button"
                onClick={handleGenerateBatchCode}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Generate Code</span>
              </button>
            </div>
            <input
              id="code"
              type="text"
              required
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value.toUpperCase())}
              placeholder="e.g. SCF-2026-X892"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 font-mono text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Origin / Source */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="source">
              Origin Location / Source Field *
            </label>
            <input
              id="source"
              type="text"
              required
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Farm Field Block 12, Greenfield Valley, CA"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Quantity & Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="qty">
                Quantity *
              </label>
              <input
                id="qty"
                type="number"
                step="any"
                min="0.01"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="unit">
                Unit of Measurement *
              </label>
              <select
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="KG">KG (Kilograms)</option>
                <option value="TONNES">Tonnes</option>
                <option value="CRATES">Crates</option>
                <option value="BOXES">Boxes</option>
                <option value="LITERS">Liters</option>
                <option value="UNITS">Units</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="mdate">
                Manufacture / Harvest Date *
              </label>
              <input
                id="mdate"
                type="date"
                required
                value={manufactureDate}
                onChange={(e) => setManufactureDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="edate">
                Expiry Date (Optional)
              </label>
              <input
                id="edate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/batches')}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Register Batch & Compute Digest
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
