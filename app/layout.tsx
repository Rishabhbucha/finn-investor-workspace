import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'FINN — Focus on what matters',description:'A primary-source investment research workspace.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
