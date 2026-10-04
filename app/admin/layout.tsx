import type { Metadata } from 'next';
export const metadata: Metadata = { title: '판게아 RPG · 운영 도구', robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) { return children; }
