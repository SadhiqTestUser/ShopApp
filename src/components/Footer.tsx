import { Link } from 'react-router-dom';
import { Printer, Mail, Phone, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-xl mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                <Printer className="w-5 h-5 text-white" />
              </div>
              Printcraft
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Turning your memories into beautifully crafted products since 2015. Premium printing, personalized for you.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Products</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/products" className="hover:text-teal-400 transition-colors">Photo Books</Link></li>
              <li><Link to="/products" className="hover:text-teal-400 transition-colors">Phone Cases</Link></li>
              <li><Link to="/products" className="hover:text-teal-400 transition-colors">Photo Mugs</Link></li>
              <li><Link to="/products" className="hover:text-teal-400 transition-colors">Wall Art</Link></li>
              <li><Link to="/products" className="hover:text-teal-400 transition-colors">Stationery</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-teal-400 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-teal-400 transition-colors">How It Works</a></li>
              <li><a href="#" className="hover:text-teal-400 transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-teal-400 transition-colors">Support</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-teal-400" /> hello@printcraft.com</li>
              <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-teal-400" /> +1 (800) 555-0199</li>
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4 text-teal-400" /> 123 Print Street, NY</li>
            </ul>
            <div className="flex gap-3 mt-4">
              <a href="#" className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-teal-600 flex items-center justify-center transition-colors"><Facebook className="w-4 h-4" /></a>
              <a href="#" className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-teal-600 flex items-center justify-center transition-colors"><Instagram className="w-4 h-4" /></a>
              <a href="#" className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-teal-600 flex items-center justify-center transition-colors"><Twitter className="w-4 h-4" /></a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 text-center text-sm text-slate-500">
          (c) {new Date().getFullYear()} Printcraft. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
