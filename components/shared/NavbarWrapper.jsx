'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'

const LANDING_PAGE = '/'

export default function NavbarWrapper() {
  const pathname = usePathname()
  
  // Hide navbar on landing page - landing has its own
  if (pathname === LANDING_PAGE) {
    return null
  }
  
  return <Navbar />
}