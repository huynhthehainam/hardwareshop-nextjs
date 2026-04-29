'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useEffect, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchInputProps {
  placeholder: string;
  defaultValue?: string;
}

export function SearchInput({ placeholder, defaultValue = '' }: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    
    // Only trigger update if the local value differs from the URL state
    if (value === currentSearch) return;

    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set('search', value);
      } else {
        params.delete('search');
      }

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [value, pathname, router, searchParams]);

  return (
    <div className="relative flex-1">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]">
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </div>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-10 rounded-xl border-[#E2E8F0] focus:border-[#059669] focus:ring-[#059669]/10 h-11"
      />
    </div>
  );
}
