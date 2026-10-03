import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'TIDEBOUND · 운영 도구', robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) { return children; }
