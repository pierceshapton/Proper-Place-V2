/**
 * Stage color definitions — all Tailwind class strings are written out
 * explicitly so the JIT compiler includes them in the build.
 */

// ── Backward-compatible flat list (existing DB values use these keys) ──────────
export const AVAILABLE_COLORS = [
  // Original 500-level keys (kept for DB compat)
  'blue', 'sky', 'cyan', 'teal', 'emerald', 'green', 'lime',
  'yellow', 'amber', 'orange', 'red', 'rose', 'pink', 'fuchsia',
  'purple', 'violet', 'indigo', 'slate', 'zinc',
  // Light shades (300)
  'blue-300', 'sky-300', 'cyan-300', 'teal-300', 'emerald-300', 'green-300', 'lime-300',
  'yellow-300', 'amber-300', 'orange-300', 'red-300', 'rose-300', 'pink-300', 'fuchsia-300',
  'purple-300', 'violet-300', 'indigo-300', 'slate-300', 'zinc-300',
  // Dark shades (700)
  'blue-700', 'sky-700', 'cyan-700', 'teal-700', 'emerald-700', 'green-700', 'lime-700',
  'yellow-700', 'amber-700', 'orange-700', 'red-700', 'rose-700', 'pink-700', 'fuchsia-700',
  'purple-700', 'violet-700', 'indigo-700', 'slate-700', 'zinc-700',
] as const;

export type StageColor = typeof AVAILABLE_COLORS[number];

// ── Organized groups for the color picker UI ──────────────────────────────────
export const COLOR_GROUPS: Array<{ label: string; shades: [string, string, string] }> = [
  { label: 'Blue',    shades: ['blue-300',    'blue',    'blue-700']    },
  { label: 'Sky',     shades: ['sky-300',     'sky',     'sky-700']     },
  { label: 'Cyan',    shades: ['cyan-300',    'cyan',    'cyan-700']    },
  { label: 'Teal',   shades: ['teal-300',    'teal',    'teal-700']    },
  { label: 'Emerald', shades: ['emerald-300', 'emerald', 'emerald-700'] },
  { label: 'Green',   shades: ['green-300',   'green',   'green-700']   },
  { label: 'Lime',    shades: ['lime-300',    'lime',    'lime-700']    },
  { label: 'Yellow',  shades: ['yellow-300',  'yellow',  'yellow-700']  },
  { label: 'Amber',   shades: ['amber-300',   'amber',   'amber-700']   },
  { label: 'Orange',  shades: ['orange-300',  'orange',  'orange-700']  },
  { label: 'Red',     shades: ['red-300',     'red',     'red-700']     },
  { label: 'Rose',    shades: ['rose-300',    'rose',    'rose-700']    },
  { label: 'Pink',    shades: ['pink-300',    'pink',    'pink-700']    },
  { label: 'Fuchsia', shades: ['fuchsia-300', 'fuchsia', 'fuchsia-700'] },
  { label: 'Purple',  shades: ['purple-300',  'purple',  'purple-700']  },
  { label: 'Violet',  shades: ['violet-300',  'violet',  'violet-700']  },
  { label: 'Indigo',  shades: ['indigo-300',  'indigo',  'indigo-700']  },
  { label: 'Slate',   shades: ['slate-300',   'slate',   'slate-700']   },
  { label: 'Zinc',    shades: ['zinc-300',    'zinc',    'zinc-700']    },
];

// Hex values for every color key — used for inline styles to avoid Tailwind JIT purging
export const COLOR_HEX: Record<string, string> = {
  // 500 (medium)
  blue:       '#3b82f6', sky:     '#0ea5e9', cyan:    '#06b6d4', teal:    '#14b8a6',
  emerald:    '#10b981', green:   '#22c55e', lime:    '#84cc16', yellow:  '#eab308',
  amber:      '#f59e0b', orange:  '#f97316', red:     '#ef4444', rose:    '#f43f5e',
  pink:       '#ec4899', fuchsia: '#d946ef', purple:  '#a855f7', violet:  '#8b5cf6',
  indigo:     '#6366f1', slate:   '#64748b', zinc:    '#71717a',
  // 300 (light)
  'blue-300':    '#93c5fd', 'sky-300':     '#7dd3fc', 'cyan-300':    '#67e8f9',
  'teal-300':    '#5eead4', 'emerald-300': '#6ee7b7', 'green-300':   '#86efac',
  'lime-300':    '#bef264', 'yellow-300':  '#fde047', 'amber-300':   '#fcd34d',
  'orange-300':  '#fdba74', 'red-300':     '#fca5a5', 'rose-300':    '#fda4af',
  'pink-300':    '#f9a8d4', 'fuchsia-300': '#f0abfc', 'purple-300':  '#d8b4fe',
  'violet-300':  '#c4b5fd', 'indigo-300':  '#a5b4fc', 'slate-300':   '#cbd5e1',
  'zinc-300':    '#d4d4d8',
  // 700 (dark)
  'blue-700':    '#1d4ed8', 'sky-700':     '#0369a1', 'cyan-700':    '#0e7490',
  'teal-700':    '#0f766e', 'emerald-700': '#047857', 'green-700':   '#15803d',
  'lime-700':    '#4d7c0f', 'yellow-700':  '#a16207', 'amber-700':   '#b45309',
  'orange-700':  '#c2410c', 'red-700':     '#b91c1c', 'rose-700':    '#be123c',
  'pink-700':    '#be185d', 'fuchsia-700': '#a21caf', 'purple-700':  '#7e22ce',
  'violet-700':  '#6d28d9', 'indigo-700':  '#4338ca', 'slate-700':   '#334155',
  'zinc-700':    '#3f3f46',
};


export const COLOR_MAP: Record<string, {
  border: string; bg: string; activeBg: string;
  badgeBg: string; badgeText: string; badgeBorder: string; dot: string;
}> = {
  // ── 500 (medium) ──
  blue:       { border: 'border-blue-500',    bg: 'bg-blue-500',    activeBg: 'bg-blue-600',    badgeBg: 'bg-blue-500/10',    badgeText: 'text-blue-400',    badgeBorder: 'border-blue-500/20',    dot: 'bg-blue-500'    },
  sky:        { border: 'border-sky-500',     bg: 'bg-sky-500',     activeBg: 'bg-sky-600',     badgeBg: 'bg-sky-500/10',     badgeText: 'text-sky-400',     badgeBorder: 'border-sky-500/20',     dot: 'bg-sky-500'     },
  cyan:       { border: 'border-cyan-500',    bg: 'bg-cyan-500',    activeBg: 'bg-cyan-600',    badgeBg: 'bg-cyan-500/10',    badgeText: 'text-cyan-400',    badgeBorder: 'border-cyan-500/20',    dot: 'bg-cyan-500'    },
  teal:       { border: 'border-teal-500',    bg: 'bg-teal-500',    activeBg: 'bg-teal-600',    badgeBg: 'bg-teal-500/10',    badgeText: 'text-teal-400',    badgeBorder: 'border-teal-500/20',    dot: 'bg-teal-500'    },
  emerald:    { border: 'border-emerald-500', bg: 'bg-emerald-500', activeBg: 'bg-emerald-600', badgeBg: 'bg-emerald-500/10', badgeText: 'text-emerald-400', badgeBorder: 'border-emerald-500/20', dot: 'bg-emerald-500' },
  green:      { border: 'border-green-500',   bg: 'bg-green-500',   activeBg: 'bg-green-600',   badgeBg: 'bg-green-500/10',   badgeText: 'text-green-400',   badgeBorder: 'border-green-500/20',   dot: 'bg-green-500'   },
  lime:       { border: 'border-lime-500',    bg: 'bg-lime-500',    activeBg: 'bg-lime-600',    badgeBg: 'bg-lime-500/10',    badgeText: 'text-lime-400',    badgeBorder: 'border-lime-500/20',    dot: 'bg-lime-500'    },
  yellow:     { border: 'border-yellow-500',  bg: 'bg-yellow-500',  activeBg: 'bg-yellow-600',  badgeBg: 'bg-yellow-500/10',  badgeText: 'text-yellow-400',  badgeBorder: 'border-yellow-500/20',  dot: 'bg-yellow-500'  },
  amber:      { border: 'border-amber-500',   bg: 'bg-amber-500',   activeBg: 'bg-amber-600',   badgeBg: 'bg-amber-500/10',   badgeText: 'text-amber-400',   badgeBorder: 'border-amber-500/20',   dot: 'bg-amber-500'   },
  orange:     { border: 'border-orange-500',  bg: 'bg-orange-500',  activeBg: 'bg-orange-600',  badgeBg: 'bg-orange-500/10',  badgeText: 'text-orange-400',  badgeBorder: 'border-orange-500/20',  dot: 'bg-orange-500'  },
  red:        { border: 'border-red-500',     bg: 'bg-red-500',     activeBg: 'bg-red-600',     badgeBg: 'bg-red-500/10',     badgeText: 'text-red-400',     badgeBorder: 'border-red-500/20',     dot: 'bg-red-500'     },
  rose:       { border: 'border-rose-500',    bg: 'bg-rose-500',    activeBg: 'bg-rose-600',    badgeBg: 'bg-rose-500/10',    badgeText: 'text-rose-400',    badgeBorder: 'border-rose-500/20',    dot: 'bg-rose-500'    },
  pink:       { border: 'border-pink-500',    bg: 'bg-pink-500',    activeBg: 'bg-pink-600',    badgeBg: 'bg-pink-500/10',    badgeText: 'text-pink-400',    badgeBorder: 'border-pink-500/20',    dot: 'bg-pink-500'    },
  fuchsia:    { border: 'border-fuchsia-500', bg: 'bg-fuchsia-500', activeBg: 'bg-fuchsia-600', badgeBg: 'bg-fuchsia-500/10', badgeText: 'text-fuchsia-400', badgeBorder: 'border-fuchsia-500/20', dot: 'bg-fuchsia-500' },
  purple:     { border: 'border-purple-500',  bg: 'bg-purple-500',  activeBg: 'bg-purple-600',  badgeBg: 'bg-purple-500/10',  badgeText: 'text-purple-400',  badgeBorder: 'border-purple-500/20',  dot: 'bg-purple-500'  },
  violet:     { border: 'border-violet-500',  bg: 'bg-violet-500',  activeBg: 'bg-violet-600',  badgeBg: 'bg-violet-500/10',  badgeText: 'text-violet-400',  badgeBorder: 'border-violet-500/20',  dot: 'bg-violet-500'  },
  indigo:     { border: 'border-indigo-500',  bg: 'bg-indigo-500',  activeBg: 'bg-indigo-600',  badgeBg: 'bg-indigo-500/10',  badgeText: 'text-indigo-400',  badgeBorder: 'border-indigo-500/20',  dot: 'bg-indigo-500'  },
  slate:      { border: 'border-slate-500',   bg: 'bg-slate-500',   activeBg: 'bg-slate-600',   badgeBg: 'bg-slate-500/10',   badgeText: 'text-slate-400',   badgeBorder: 'border-slate-500/20',   dot: 'bg-slate-500'   },
  zinc:       { border: 'border-zinc-500',    bg: 'bg-zinc-500',    activeBg: 'bg-zinc-600',    badgeBg: 'bg-zinc-500/10',    badgeText: 'text-zinc-400',    badgeBorder: 'border-zinc-500/20',    dot: 'bg-zinc-500'    },
  // ── 300 (light) ──
  'blue-300':    { border: 'border-blue-300',    bg: 'bg-blue-300',    activeBg: 'bg-blue-400',    badgeBg: 'bg-blue-300/10',    badgeText: 'text-blue-300',    badgeBorder: 'border-blue-300/20',    dot: 'bg-blue-300'    },
  'sky-300':     { border: 'border-sky-300',     bg: 'bg-sky-300',     activeBg: 'bg-sky-400',     badgeBg: 'bg-sky-300/10',     badgeText: 'text-sky-300',     badgeBorder: 'border-sky-300/20',     dot: 'bg-sky-300'     },
  'cyan-300':    { border: 'border-cyan-300',    bg: 'bg-cyan-300',    activeBg: 'bg-cyan-400',    badgeBg: 'bg-cyan-300/10',    badgeText: 'text-cyan-300',    badgeBorder: 'border-cyan-300/20',    dot: 'bg-cyan-300'    },
  'teal-300':    { border: 'border-teal-300',    bg: 'bg-teal-300',    activeBg: 'bg-teal-400',    badgeBg: 'bg-teal-300/10',    badgeText: 'text-teal-300',    badgeBorder: 'border-teal-300/20',    dot: 'bg-teal-300'    },
  'emerald-300': { border: 'border-emerald-300', bg: 'bg-emerald-300', activeBg: 'bg-emerald-400', badgeBg: 'bg-emerald-300/10', badgeText: 'text-emerald-300', badgeBorder: 'border-emerald-300/20', dot: 'bg-emerald-300' },
  'green-300':   { border: 'border-green-300',   bg: 'bg-green-300',   activeBg: 'bg-green-400',   badgeBg: 'bg-green-300/10',   badgeText: 'text-green-300',   badgeBorder: 'border-green-300/20',   dot: 'bg-green-300'   },
  'lime-300':    { border: 'border-lime-300',    bg: 'bg-lime-300',    activeBg: 'bg-lime-400',    badgeBg: 'bg-lime-300/10',    badgeText: 'text-lime-300',    badgeBorder: 'border-lime-300/20',    dot: 'bg-lime-300'    },
  'yellow-300':  { border: 'border-yellow-300',  bg: 'bg-yellow-300',  activeBg: 'bg-yellow-400',  badgeBg: 'bg-yellow-300/10',  badgeText: 'text-yellow-300',  badgeBorder: 'border-yellow-300/20',  dot: 'bg-yellow-300'  },
  'amber-300':   { border: 'border-amber-300',   bg: 'bg-amber-300',   activeBg: 'bg-amber-400',   badgeBg: 'bg-amber-300/10',   badgeText: 'text-amber-300',   badgeBorder: 'border-amber-300/20',   dot: 'bg-amber-300'   },
  'orange-300':  { border: 'border-orange-300',  bg: 'bg-orange-300',  activeBg: 'bg-orange-400',  badgeBg: 'bg-orange-300/10',  badgeText: 'text-orange-300',  badgeBorder: 'border-orange-300/20',  dot: 'bg-orange-300'  },
  'red-300':     { border: 'border-red-300',     bg: 'bg-red-300',     activeBg: 'bg-red-400',     badgeBg: 'bg-red-300/10',     badgeText: 'text-red-300',     badgeBorder: 'border-red-300/20',     dot: 'bg-red-300'     },
  'rose-300':    { border: 'border-rose-300',    bg: 'bg-rose-300',    activeBg: 'bg-rose-400',    badgeBg: 'bg-rose-300/10',    badgeText: 'text-rose-300',    badgeBorder: 'border-rose-300/20',    dot: 'bg-rose-300'    },
  'pink-300':    { border: 'border-pink-300',    bg: 'bg-pink-300',    activeBg: 'bg-pink-400',    badgeBg: 'bg-pink-300/10',    badgeText: 'text-pink-300',    badgeBorder: 'border-pink-300/20',    dot: 'bg-pink-300'    },
  'fuchsia-300': { border: 'border-fuchsia-300', bg: 'bg-fuchsia-300', activeBg: 'bg-fuchsia-400', badgeBg: 'bg-fuchsia-300/10', badgeText: 'text-fuchsia-300', badgeBorder: 'border-fuchsia-300/20', dot: 'bg-fuchsia-300' },
  'purple-300':  { border: 'border-purple-300',  bg: 'bg-purple-300',  activeBg: 'bg-purple-400',  badgeBg: 'bg-purple-300/10',  badgeText: 'text-purple-300',  badgeBorder: 'border-purple-300/20',  dot: 'bg-purple-300'  },
  'violet-300':  { border: 'border-violet-300',  bg: 'bg-violet-300',  activeBg: 'bg-violet-400',  badgeBg: 'bg-violet-300/10',  badgeText: 'text-violet-300',  badgeBorder: 'border-violet-300/20',  dot: 'bg-violet-300'  },
  'indigo-300':  { border: 'border-indigo-300',  bg: 'bg-indigo-300',  activeBg: 'bg-indigo-400',  badgeBg: 'bg-indigo-300/10',  badgeText: 'text-indigo-300',  badgeBorder: 'border-indigo-300/20',  dot: 'bg-indigo-300'  },
  'slate-300':   { border: 'border-slate-300',   bg: 'bg-slate-300',   activeBg: 'bg-slate-400',   badgeBg: 'bg-slate-300/10',   badgeText: 'text-slate-300',   badgeBorder: 'border-slate-300/20',   dot: 'bg-slate-300'   },
  'zinc-300':    { border: 'border-zinc-300',    bg: 'bg-zinc-300',    activeBg: 'bg-zinc-400',    badgeBg: 'bg-zinc-300/10',    badgeText: 'text-zinc-300',    badgeBorder: 'border-zinc-300/20',    dot: 'bg-zinc-300'    },
  // ── 700 (dark) ──
  'blue-700':    { border: 'border-blue-700',    bg: 'bg-blue-700',    activeBg: 'bg-blue-800',    badgeBg: 'bg-blue-700/10',    badgeText: 'text-blue-400',    badgeBorder: 'border-blue-700/20',    dot: 'bg-blue-700'    },
  'sky-700':     { border: 'border-sky-700',     bg: 'bg-sky-700',     activeBg: 'bg-sky-800',     badgeBg: 'bg-sky-700/10',     badgeText: 'text-sky-400',     badgeBorder: 'border-sky-700/20',     dot: 'bg-sky-700'     },
  'cyan-700':    { border: 'border-cyan-700',    bg: 'bg-cyan-700',    activeBg: 'bg-cyan-800',    badgeBg: 'bg-cyan-700/10',    badgeText: 'text-cyan-400',    badgeBorder: 'border-cyan-700/20',    dot: 'bg-cyan-700'    },
  'teal-700':    { border: 'border-teal-700',    bg: 'bg-teal-700',    activeBg: 'bg-teal-800',    badgeBg: 'bg-teal-700/10',    badgeText: 'text-teal-400',    badgeBorder: 'border-teal-700/20',    dot: 'bg-teal-700'    },
  'emerald-700': { border: 'border-emerald-700', bg: 'bg-emerald-700', activeBg: 'bg-emerald-800', badgeBg: 'bg-emerald-700/10', badgeText: 'text-emerald-400', badgeBorder: 'border-emerald-700/20', dot: 'bg-emerald-700' },
  'green-700':   { border: 'border-green-700',   bg: 'bg-green-700',   activeBg: 'bg-green-800',   badgeBg: 'bg-green-700/10',   badgeText: 'text-green-400',   badgeBorder: 'border-green-700/20',   dot: 'bg-green-700'   },
  'lime-700':    { border: 'border-lime-700',    bg: 'bg-lime-700',    activeBg: 'bg-lime-800',    badgeBg: 'bg-lime-700/10',    badgeText: 'text-lime-400',    badgeBorder: 'border-lime-700/20',    dot: 'bg-lime-700'    },
  'yellow-700':  { border: 'border-yellow-700',  bg: 'bg-yellow-700',  activeBg: 'bg-yellow-800',  badgeBg: 'bg-yellow-700/10',  badgeText: 'text-yellow-400',  badgeBorder: 'border-yellow-700/20',  dot: 'bg-yellow-700'  },
  'amber-700':   { border: 'border-amber-700',   bg: 'bg-amber-700',   activeBg: 'bg-amber-800',   badgeBg: 'bg-amber-700/10',   badgeText: 'text-amber-400',   badgeBorder: 'border-amber-700/20',   dot: 'bg-amber-700'   },
  'orange-700':  { border: 'border-orange-700',  bg: 'bg-orange-700',  activeBg: 'bg-orange-800',  badgeBg: 'bg-orange-700/10',  badgeText: 'text-orange-400',  badgeBorder: 'border-orange-700/20',  dot: 'bg-orange-700'  },
  'red-700':     { border: 'border-red-700',     bg: 'bg-red-700',     activeBg: 'bg-red-800',     badgeBg: 'bg-red-700/10',     badgeText: 'text-red-400',     badgeBorder: 'border-red-700/20',     dot: 'bg-red-700'     },
  'rose-700':    { border: 'border-rose-700',    bg: 'bg-rose-700',    activeBg: 'bg-rose-800',    badgeBg: 'bg-rose-700/10',    badgeText: 'text-rose-400',    badgeBorder: 'border-rose-700/20',    dot: 'bg-rose-700'    },
  'pink-700':    { border: 'border-pink-700',    bg: 'bg-pink-700',    activeBg: 'bg-pink-800',    badgeBg: 'bg-pink-700/10',    badgeText: 'text-pink-400',    badgeBorder: 'border-pink-700/20',    dot: 'bg-pink-700'    },
  'fuchsia-700': { border: 'border-fuchsia-700', bg: 'bg-fuchsia-700', activeBg: 'bg-fuchsia-800', badgeBg: 'bg-fuchsia-700/10', badgeText: 'text-fuchsia-400', badgeBorder: 'border-fuchsia-700/20', dot: 'bg-fuchsia-700' },
  'purple-700':  { border: 'border-purple-700',  bg: 'bg-purple-700',  activeBg: 'bg-purple-800',  badgeBg: 'bg-purple-700/10',  badgeText: 'text-purple-400',  badgeBorder: 'border-purple-700/20',  dot: 'bg-purple-700'  },
  'violet-700':  { border: 'border-violet-700',  bg: 'bg-violet-700',  activeBg: 'bg-violet-800',  badgeBg: 'bg-violet-700/10',  badgeText: 'text-violet-400',  badgeBorder: 'border-violet-700/20',  dot: 'bg-violet-700'  },
  'indigo-700':  { border: 'border-indigo-700',  bg: 'bg-indigo-700',  activeBg: 'bg-indigo-800',  badgeBg: 'bg-indigo-700/10',  badgeText: 'text-indigo-400',  badgeBorder: 'border-indigo-700/20',  dot: 'bg-indigo-700'  },
  'slate-700':   { border: 'border-slate-700',   bg: 'bg-slate-700',   activeBg: 'bg-slate-800',   badgeBg: 'bg-slate-700/10',   badgeText: 'text-slate-400',   badgeBorder: 'border-slate-700/20',   dot: 'bg-slate-700'   },
  'zinc-700':    { border: 'border-zinc-700',    bg: 'bg-zinc-700',    activeBg: 'bg-zinc-800',    badgeBg: 'bg-zinc-700/10',    badgeText: 'text-zinc-400',    badgeBorder: 'border-zinc-700/20',    dot: 'bg-zinc-700'    },
};

export const FIELD_TYPE_BADGES: Record<string, { label: string; cls: string }> = {
  text:     { label: 'Text',     cls: 'bg-slate-800 text-slate-400' },
  number:   { label: 'Number',   cls: 'bg-blue-500/10 text-blue-400' },
  select:   { label: 'Select',   cls: 'bg-violet-500/10 text-violet-400' },
  date:     { label: 'Date',     cls: 'bg-amber-500/10 text-amber-400' },
  checkbox: { label: 'Yes/No',   cls: 'bg-emerald-500/10 text-emerald-400' },
  url:      { label: 'URL',      cls: 'bg-cyan-500/10 text-cyan-400' },
};

export function stageColors(color: string) {
  return COLOR_MAP[color] ?? COLOR_MAP['slate'];
}

export function getStageColor(color: string) {
  return COLOR_MAP[color]?.bg?.replace('bg-', '#').replace(/-\d+$/, '') ?? '#64748b';
}
