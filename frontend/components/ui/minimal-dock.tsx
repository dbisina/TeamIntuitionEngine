'use client'
import React, { useState } from 'react';

export interface DockItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

interface MinimalDockProps {
  items: DockItem[];
  activeId?: string;
  game?: string; // "VALORANT" or "LoL"
}

interface DockItemProps {
  item: DockItem;
  isHovered: boolean;
  isActive: boolean;
  onHover: (id: string | null) => void;
  game: string;
}

const DockItemComponent: React.FC<DockItemProps> = ({ item, isHovered, isActive, onHover, game }) => {
  // Determine colors based on game
  const isLol = game === 'LoL';
  const activeColorClass = isLol ? 'text-[#C89B3C]' : 'text-[#FF4655]';
  const activeBorderClass = isLol ? 'border-[#C89B3C]/40' : 'border-[#FF4655]/40';
  const activeShadowClass = isLol ? 'shadow-[0_0_20px_rgba(200,155,60,0.3)]' : 'shadow-[0_0_20px_rgba(255,70,85,0.3)]';
  const activeBgClass = isLol ? 'bg-[#C89B3C]/20' : 'bg-[#FF4655]/20';
  const activeDropShadow = isLol ? 'drop-shadow-[0_0_8px_rgba(200,155,60,0.5)]' : 'drop-shadow-[0_0_8px_rgba(255,70,85,0.5)]';

  // Idle opacity logic: if nothing hovered, slightly transparent. Else, if hovered/active full opacity.
  const opacityClass = (isHovered || isActive) ? 'opacity-100' : 'opacity-80 hover:opacity-100';

  return (
    <div
      className={`relative group z-50 ${opacityClass} transition-opacity duration-300`}
      onMouseEnter={() => onHover(item.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div
        className={`
          relative flex items-center justify-center
          w-16 h-16 rounded-full
          bg-black/60 backdrop-blur-md
          border border-white/10
          transition-all duration-300 ease-out
          cursor-pointer
          shadow-lg
          ${(isHovered || isActive)
            ? 'scale-110 -translate-y-2' 
            : 'hover:scale-105 hover:-translate-y-1'
          }
          ${isActive ? `${activeBorderClass} ${activeShadowClass} ${activeBgClass}` : 'hover:bg-white/10'}
        `}
        onClick={item.onClick}
        style={{
          transitionProperty: 'box-shadow, transform, background, border-color'
        }}
      >
        <div className={`
          transition-all duration-300
          ${(isHovered || isActive) ? `scale-110 ${activeColorClass} ${activeDropShadow}` : 'text-slate-400'}
        `}>
          {item.icon}
        </div>
      </div>
      
      {/* Tooltip */}
      <div className={`
        absolute -top-12 left-1/2 transform -translate-x-1/2
        px-3 py-1 rounded-full
        bg-black/80 backdrop-blur
        text-white text-[10px] font-bold uppercase tracking-widest
        border border-white/10
        transition-all duration-200
        pointer-events-none
        whitespace-nowrap
        ${isHovered 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-2'
        }
        shadow-xl
      `}>
        {item.label}
      </div>
    </div>
  );
};

export const MinimalistDock: React.FC<MinimalDockProps> = ({ items, activeId, game = "VALORANT" }) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <div className="w-full flex items-center justify-center pb-8 pt-4">
      <div className="relative">
        {/* Dock Items - Ungrouped */}
        <div className={`
          flex items-end gap-6 p-4 rounded-full border border-white/5 bg-black/20 backdrop-blur-sm shadow-2xl
          transition-all duration-500 ease-out
          ${hoveredItem ? 'scale-105' : ''}
        `}>
          {items.map((item) => (
            <DockItemComponent
              key={item.id}
              item={item}
              isActive={activeId === item.id}
              isHovered={hoveredItem === item.id}
              onHover={setHoveredItem}
              game={game}
            />
          ))}
        </div>
        

      </div>
    </div>
  );
};
