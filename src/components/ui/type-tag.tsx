import { TYPE_COLORS, TYPES_LIST, TYPE_NAME_MAP } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function TypeIcon({ name, size = 16 }: { name: string, size?: number }) {
  // Use the mapping to get the English slug if it's not already a slug
  const slug = TYPE_NAME_MAP[name] || name.toLowerCase()
  const index = TYPES_LIST.indexOf(slug)
  if (index === -1) return null
  
  return (
    <div 
      className="shrink-0"
      style={{
        width: size,
        height: size,
        backgroundImage: 'url(/types.webp)',
        backgroundSize: `${size}px auto`,
        backgroundPosition: `0 -${index * size}px`,
        imageRendering: 'pixelated'
      }}
    />
  )
}

export function TypeTag({ name, size = 'sm' }: { name: string, size?: 'sm' | 'lg' }) {
  const isLarge = size === 'lg'
  const slug = TYPE_NAME_MAP[name] || name.toLowerCase()
  
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 border border-white/20 font-bold text-white shadow-sm transition-transform hover:scale-105",
        isLarge ? "px-3 py-1.5 text-xs" : "px-2 py-1 text-[10px]"
      )}
      style={{
        backgroundColor: TYPE_COLORS[slug] || '#475569',
      }}
    >
      <TypeIcon name={name} size={isLarge ? 18 : 14} />
      {name}
    </span>
  )
}
