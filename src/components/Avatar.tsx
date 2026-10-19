const GRADIENTS = [
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
];

export default function Avatar({
  name,
  size = 'sm',
}: {
  name?: string;
  size?: 'sm' | 'md';
}) {
  const initial = (name?.trim()?.charAt(0) ?? '?').toUpperCase();
  const gradient = GRADIENTS[(initial.charCodeAt(0) || 0) % GRADIENTS.length];
  const dims = size === 'md' ? 'h-9 w-9 text-sm' : 'h-6 w-6 text-[11px]';
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ${gradient} ${dims}`}
    >
      {initial}
    </div>
  );
}
