'use client';

import React, { useState, useEffect } from 'react';
import { Package, Plus, RefreshCw, Search } from 'lucide-react';
import { ProductItem } from '@/types/crm';

export const ProductsListView: React.FC = () => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState('PRODUCT');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('UNIT');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(18.0);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/products?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const json = await res.json();
        setProducts(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(), 200);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/crm/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, category, unit, unitPrice, taxRate }),
      });
      if (res.ok) {
        setShowAdd(false);
        setName('');
        setUnitPrice(0);
        fetchProducts();
      }
    } catch (err) {
      console.error('Error adding product:', err);
    }
  };

  return (
    <div className="space-y-6 font-sans select-none text-slate-800 pb-12">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
            Products & Services
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise rate card, subscription items, hardware nodes, and commercial services
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Product/Service</span>
        </button>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        <div className="p-3 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search products & services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#0D9488]"
            />
          </div>
          <button onClick={fetchProducts} className="p-1.5 rounded-lg border border-[#E2E8F0] text-slate-500 hover:bg-[#F0FDFA]">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0D9488]' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F0FDFA]/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">GST Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-[#F0FDFA]/60">
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">{p.productCode}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0D9488]/10 text-[#0D9488]">
                      {p.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{p.category || 'General'}</td>
                  <td className="py-3 px-4 text-slate-600">{p.unit}</td>
                  <td className="py-3 px-4 text-right font-black text-slate-900">
                    ₹{p.unitPrice.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">
                    {p.taxRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-sm font-black text-slate-900">Add Product or Commercial Service</h2>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                  >
                    <option value="PRODUCT">Physical Hardware/Product</option>
                    <option value="SERVICE">Professional Service</option>
                    <option value="SUBSCRIPTION">SaaS Subscription</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">GST (%)</label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#0D9488] text-white font-bold"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
