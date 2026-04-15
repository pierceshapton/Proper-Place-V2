/**
 * Stage color definitions — all Tailwind class strings are written out
 * explicitly so the JIT compiler includes them in the build.
 */

export const AVAILABLE_COLORS = [
  'blue', 'sky', 'violet', 'purple', 'indigo', 'pink',
  'rose', 'red', 'orange', 'amber', 'yellow', 'lime',
  'emerald', 'teal', 'cyan', 'slate',
] as const;

export type StageColor = typeof AVAILABLE_COLORS[number];

export const COLOR_MAP: Record<string, {
  border: string; bg: string; activeBg: string;
  badgeBg: string; badgeText: string; badgeBorder: string; dot: string;
}> = {
  blue:    { border: 'border-blue-500',    bg: 'bg-blue-500',    activeBg: 'bg-blue-600',    badgeBg: 'bg-blue-500/10',    badgeText: 'text-blue-400',    badgeBorder: 'border-blue-500/20',    dot: 'bg-blue-500'    },
  sky:     { border: 'border-sky-500',     bg: 'bg-sky-500',     activeBg: 'bg-sky-600',     badgeBg: 'bg-sky-500/10',     badgeText: 'text-sky-400',     badgeBorder: 'border-sky-500/20',     dot: 'bg-sky-500'     },
  violet:  { border: 'border-violet-500',  bg: 'bg-violet-500',  activeBg: 'bg-violet-600',  badgeBg: 'bg-violet-500/10',  badgeText: 'text-violet-400',  badgeBorder: 'border-violet-500/20',  dot: 'bg-violet-500'  },
  purple:  { border: 'border-purple-500',  bg: 'bg-purple-500',  activeBg: 'bg-purple-600',  badgeBg: 'bg-purple-500/10',  badgeText: 'text-purple-400',  badgeBorder: 'border-purple-500/20',  dot: 'bg-purple-500'  },
  indigo:  { border: 'border-indigo-500',  bg: 'bg-indigo-500',  activeBg: 'bg-indigo-600',  badgeBg: 'bg-indigo-500/10',  badgeText: 'text-indigo-400',  badgeBorder: 'border-indigo-500/20',  dot: 'bg-indigo-500'  },
  pink:    { border: 'border-pink-500',    bg: 'bg-pink-500',    activeBg: 'bg-pink-600',    badgeBg: 'bg-pink-500/10',    badgeText: 'text-pink-400',    badgeBorder: 'border-pink-500/20',    dot: 'bg-pink-500'    },
  rose:    { border: 'border-rose-500',    bg: 'bg-rose-500',    activeBg: 'bg-rose-600',    badgeBg: 'bg-rose-500/10',    badgeText: 'text-rose-400',    badgeBorder: 'border-rose-500/20',    dot: 'bg-rose-500'    },
  red:     { border: 'border-red-500',     bg: 'bg-red-500',     activeBg: 'bg-red-600',     badgeBg: 'bg-red-500/10',     badgeText: 'text-red-400',     badgeBorder: 'border-red-500/20',     dot: 'bg-red-500'     },
  orange:  { border: 'border-orange-500',  bg: 'bg-orange-500',  activeBg: 'bg-orange-600',  badgeBg: 'bg-orange-500/10',  badgeText: 'text-orange-400',  badgeBorder: 'border-orange-500/20',  dot: 'bg-orange-500'  },
  amber:   { border: 'border-amber-500',   bg: 'bg-amber-500',   activeBg: 'bg-amber-600',   badgeBg: 'bg-amber-500/10',   badgeText: 'text-amber-400',   badgeBorder: 'border-amber-500/20',   dot: 'bg-amber-500'   },
  yellow:  { border: 'border-yellow-500',  bg: 'bg-yellow-500',  activeBg: 'bg-yellow-600',  badgeBg: 'bg-yellow-500/10',  badgeText: 'text-yellow-400',  badgeBorder: 'border-yellow-500/20',  dot: 'bg-yellow-500'  },
  lime:    { border: 'border-lime-500',    bg: 'bg-lime-500',    activeBg: 'bg-lime-600',    badgeBg: 'bg-lime-500/10',    badgeText: 'text-lime-400',    badgeBorder: 'border-lime-500/20',    dot: 'bg-lime-500'    },
  emerald: { border: 'border-emerald-500', bg: 'bg-emerald-500', activeBg: 'bg-emerald-600', badgeBg: 'bg-emerald-500/10', badgeText: 'text-emerald-400', badgeBorder: 'border-emerald-500/20', dot: 'bg-emerald-500' },
  teal:    { border: 'border-teal-500',    bg: 'bg-teal-500',    activeBg: 'bg-teal-600',    badgeBg: 'bg-teal-500/10',    badgeText: 'text-teal-400',    badgeBorder: 'border-teal-500/20',    dot: 'bg-teal-500'    },
  cyan:    { border: 'border-cyan-500',    bg: 'bg-cyan-500',    activeBg: 'bg-cyan-600',    badgeBg: 'bg-cyan-500/10',    badgeText: 'text-cyan-400',    badgeBorder: 'border-cyan-500/20',    dot: 'bg-cyan-500'    },
  slate:   { border: 'border-slate-500',   bg: 'bg-slate-500',   activeBg: 'bg-slate-600',   badgeBg: 'bg-slate-500/10',   badgeText: 'text-slate-400',   badgeBorder: 'border-slate-500/20',   dot: 'bg-slate-500'   },
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
