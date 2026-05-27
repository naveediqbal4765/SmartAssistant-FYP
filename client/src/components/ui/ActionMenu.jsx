import { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { overlayLayers } from './overlayLayers';

export default function ActionMenu({ items = [], align = 'right', label = 'Actions' }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const visibleItems = items.filter(Boolean);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  if (!visibleItems.length) return null;

  return (
    <div ref={menuRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="motion-interactive inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm hover:bg-gray-100"
        aria-label={label}
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <div className={`motion-dropdown-in absolute top-full ${overlayLayers.dropdown} mt-2 min-w-44 rounded-xl border border-gray-100 bg-white py-1 text-sm text-gray-900 shadow-xl ${align === 'left' ? 'left-0' : 'right-0'}`}>
          {visibleItems.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onClick?.();
              }}
              className={`motion-interactive block w-full px-3 py-2 text-left hover:bg-gray-50 disabled:text-gray-400 ${item.danger ? 'text-red-600 hover:bg-red-50' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
