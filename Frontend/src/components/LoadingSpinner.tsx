import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-4">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  );
}