'use client';

import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function LogoutButton({ label }: { label: string }) {
  return (
    <Button 
      variant="outline" 
      className="border-[#059669] text-[#059669] hover:bg-[#059669] hover:text-white transition-all rounded-xl px-5 cursor-pointer"
      onClick={async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch (error) {
          console.error('Logout failed:', error);
        } finally {
          window.location.href = '/login';
        }
      }}
    >
      <LogOut className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
}
