"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Package, Tag, ScanLine } from 'lucide-react';

const Sidebar = () => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Demand Forecasting', href: '/forecasting', icon: TrendingUp },
    { name: 'Inventory & Restock', href: '/inventory', icon: Package },
    { name: 'Dynamic Pricing', href: '/pricing', icon: Tag },
    { name: 'OCR Expiry', href: '/ocr', icon: ScanLine },
  ];

  return (
    <aside className="sidebar">
      <div className="header">
        <h1 className="title" style={{ color: 'var(--primary)' }}>QuickAI</h1>
        <p className="subtitle">Store Management</p>
      </div>
      <nav>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
