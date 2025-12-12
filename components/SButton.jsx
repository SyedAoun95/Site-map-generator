"use client";
import React from 'react';
import { Loader2 } from 'lucide-react';

export default function SButton({ variant = 'primary', children, onClick, disabled, loading, className = '' }) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl shadow-md';
  const size = 'px-10 py-3 text-lg';
  const primary = 'bg-[#0b1220] text-white hover:bg-[#06090f]';
  const disabledCls = 'opacity-60 pointer-events-none';

  const cls = `${base} ${size} ${variant === 'primary' ? primary : ''} ${disabled ? disabledCls : ''} ${className}`;

  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      <span>{children}</span>
    </button>
  );
}
