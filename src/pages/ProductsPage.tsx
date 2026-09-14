import { useEffect, useState } from 'react';
import { Loader2, ArrowRight, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { formatINR } from '@/lib/currency';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProducts(data ?? []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    setSearchQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];
  const filtered = products.filter((p) => {
    const matchesCategory = filter === 'All' || p.category === filter;
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(searchQuery ? `/products?q=${encodeURIComponent(searchQuery)}` : '/products');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-teal-600 to-cyan-700 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-white">All Products</h1>
          <p className="mt-3 text-teal-50">Browse our full catalog of customizable print products</p>
          <form onSubmit={handleSearch} className="mt-6 max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by product name..."
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white text-slate-800 outline-none shadow-lg"
              />
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                filter === cat
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg">No products found for "{searchQuery}"</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((p) => (
              <div key={p.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 flex flex-col">
                <Link to={`/products/${p.id}`} className="aspect-square overflow-hidden bg-slate-100 block">
                  <img src={p.image_url ?? ''} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </Link>
                <div className="p-4 flex flex-col flex-1">
                  <Link to={`/products/${p.id}`}>
                    <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded">{p.category}</span>
                    <h3 className="mt-2 font-semibold text-slate-900 hover:text-teal-600 transition-colors">{p.name}</h3>
                  </Link>
                  <p className="mt-1 text-sm text-slate-500 line-clamp-2">{p.description}</p>
                  <div className="mt-4 flex items-center justify-between mt-auto">
                    <span className="text-xl font-bold text-slate-900">{formatINR(p.price)}</span>
                    <Link
                      to={`/products/${p.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm transition-all"
                    >
                      View Details <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
