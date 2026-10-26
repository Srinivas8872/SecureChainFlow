import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Package, Plus, Search, Layers, AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

interface ProductItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  sku?: string;
  ownerOrganizationId?: {
    id: string;
    name: string;
    type: string;
  };
  createdAt: string;
}

export const ProductsListPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Agricultural Produce');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await api.get<ProductItem[]>(`/products${query}`);
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.post('/products', {
        name,
        category,
        description: description || undefined,
        sku: sku || undefined,
      });
      setIsModalOpen(false);
      setName('');
      setDescription('');
      setSku('');
      await fetchProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to create product template');
    } finally {
      setSubmitting(false);
    }
  };

  const canCreate = hasRole('SUPPLIER', 'PROCESSOR', 'ADMIN');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Package className="w-7 h-7 text-sky-400" />
            <span>Product Templates</span>
          </h1>
          <p className="text-sm text-slate-400">
            Define canonical master product templates used for batch registration across the consortium.
          </p>
        </div>

        {canCreate && (
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>New Product Template</span>
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name, category, or SKU..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Product List */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm text-slate-400">Loading catalog templates...</div>
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
          <Layers className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-white">No Product Templates Found</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            {search ? 'Try adjusting your search criteria.' : 'Create your first product template to begin registering batches.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white text-base leading-snug">{product.name}</h3>
                  <span className="text-xs font-mono text-slate-400">
                    SKU: {product.sku || 'N/A'}
                  </span>
                </div>
                <Badge variant="purple">{product.category}</Badge>
              </div>

              {product.description && (
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {product.description}
                </p>
              )}

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                <span>Owner: <strong className="text-slate-300">{product.ownerOrganizationId?.name || 'Consortium'}</strong></span>
                <span>{new Date(product.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Create Master Product Template</h2>
            
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="pname">
                  Product Name *
                </label>
                <input
                  id="pname"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Grade-A Organic Hass Avocados"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="pcat">
                    Category *
                  </label>
                  <input
                    id="pcat"
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Agriculture / Dairy"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="psku">
                    SKU Code
                  </label>
                  <input
                    id="psku"
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. AVO-HASS-01"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="pdesc">
                  Description & Specifications
                </label>
                <textarea
                  id="pdesc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Storage guidelines, temperature thresholds, export standards..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={submitting}>
                  Save Template
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
