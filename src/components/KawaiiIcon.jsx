import React from 'react';
import {
  Utensils, Home, Shirt, Gamepad2, HeartPulse, Wallet, Sparkles,
  PiggyBank, CreditCard, ShoppingBag, Car, BookOpen, Music, Camera,
  Tag, Gift, Landmark, Coins, TrendingUp, AlertCircle, CheckCircle2,
  Smile, Flame
} from 'lucide-react';

const iconMap = {
  'utensils': Utensils,
  'home': Home,
  'shirt': Shirt,
  'gamepad': Gamepad2,
  'heart-pulse': HeartPulse,
  'wallet': Wallet,
  'sparkles': Sparkles,
  'piggy-bank': PiggyBank,
  'credit-card': CreditCard,
  'shopping-bag': ShoppingBag,
  'car': Car,
  'book': BookOpen,
  'music': Music,
  'camera': Camera,
  'tag': Tag,
  'gift': Gift,
  'landmark': Landmark,
  'coins': Coins,
  'trending-up': TrendingUp,
  'alert': AlertCircle,
  'check': CheckCircle2,
  'flame': Flame
};

export const availableIcons = Object.keys(iconMap);

export default function KawaiiIcon({ name = 'tag', color = '#FFD6E8', size = 'md', className = '' }) {
  const IconComponent = iconMap[name] || Tag;

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  }[size] || 'w-10 h-10';

  const iconSizes = {
    sm: 14,
    md: 20,
    lg: 24,
    xl: 32
  }[size] || 20;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-2xl border-2 border-[#4A3E3D] shadow-kawaii-sm transition-transform hover:scale-105 ${sizeClasses} ${className}`}
      style={{ backgroundColor: color }}
    >
      <IconComponent size={iconSizes} className="text-[#4A3E3D]" strokeWidth={2.5} />
    </div>
  );
}
