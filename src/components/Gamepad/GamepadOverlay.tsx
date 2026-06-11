import React, { useState, useEffect, useRef } from 'react';

interface GamepadOverlayProps {
  isVisible: boolean;
  opacity?: number;
  onOpacityChange?: (val: number) => void;
  // A ref to the game's iframe/webview, to dispatch events into it
  targetIframe?: React.RefObject<HTMLIFrameElement>;
}

interface Position {
  x: number;
  y: number;
}

/**
 * Virtual Gamepad Overlay v1
 * Provides a high-performance touch UI for Android, overlaying the game.
 * Translates touch gestures into KeyboardEvents for the WebView sandbox.
 */
export const GamepadOverlay: React.FC<GamepadOverlayProps> = ({ 
  isVisible, 
  opacity = 0.5, 
  onOpacityChange,
  targetIframe 
}) => {
  const [dpadPos, setDpadPos] = useState<Position>({ x: 50, y: window.innerHeight - 200 });
  const [actionPos, setActionPos] = useState<Position>({ x: window.innerWidth - 200, y: window.innerHeight - 200 });
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Track pressed keys to avoid repeating
  const pressedKeys = useRef<Set<string>>(new Set());

  // Function to dispatch keyboard events to the game sandbox (iframe)
  const dispatchKeyEvent = (key: string, code: string, type: 'keydown' | 'keyup') => {
    if (type === 'keydown') {
      if (pressedKeys.current.has(key)) return;
      pressedKeys.current.add(key);
    } else {
      pressedKeys.current.delete(key);
    }

    // Standard KeyboardEvent payload expected by RPG Maker engines
    const eventParams = {
      key,
      code,
      keyCode: getKeyCode(key),
      which: getKeyCode(key),
      bubbles: true,
      cancelable: true,
    };

    // If we have an iframe target, dispatch inside it
    if (targetIframe && targetIframe.current && targetIframe.current.contentWindow) {
      const event = new targetIframe.current.contentWindow.KeyboardEvent(type, eventParams);
      targetIframe.current.contentWindow.document.dispatchEvent(event);
    } else {
      // Fallback: dispatch on local document
      const event = new KeyboardEvent(type, eventParams);
      document.dispatchEvent(event);
    }
  };

  const handleTouchStart = (key: string, code: string) => (e: React.TouchEvent | React.MouseEvent) => {
    if (isEditMode) return;
    e.preventDefault();
    dispatchKeyEvent(key, code, 'keydown');
  };

  const handleTouchEnd = (key: string, code: string) => (e: React.TouchEvent | React.MouseEvent) => {
    if (isEditMode) return;
    e.preventDefault();
    dispatchKeyEvent(key, code, 'keyup');
  };

  // Draggable logic for Edit Mode
  const makeDraggable = (
    setter: React.Dispatch<React.SetStateAction<Position>>
  ) => (e: React.TouchEvent) => {
    if (!isEditMode) return;
    const touch = e.touches[0];
    setter({ x: touch.clientX - 50, y: touch.clientY - 50 });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none" style={{ opacity }}>
      {/* Settings / Edit Mode Toggle */}
      <div className="absolute top-4 left-4 pointer-events-auto flex items-center gap-4 bg-black/50 p-2 rounded-lg text-white">
        <button 
          onClick={() => setIsEditMode(!isEditMode)}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
        >
          {isEditMode ? 'Save Layout' : 'Edit Layout'}
        </button>
        {isEditMode && onOpacityChange && (
          <input 
            type="range" 
            min="0.1" 
            max="1" 
            step="0.1" 
            value={opacity}
            onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
            className="w-32"
          />
        )}
      </div>

      {/* D-Pad Container */}
      <div 
        className={`absolute w-32 h-32 flex items-center justify-center pointer-events-auto
          ${isEditMode ? 'border-2 border-dashed border-yellow-400 bg-yellow-400/20' : ''}`}
        style={{ left: dpadPos.x, top: dpadPos.y }}
        onTouchMove={makeDraggable(setDpadPos)}
      >
        {/* D-Pad Layout */}
        <div className="relative w-full h-full">
          <GamepadButton 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-white/30 rounded"
            onPressStart={handleTouchStart('ArrowUp', 'ArrowUp')}
            onPressEnd={handleTouchEnd('ArrowUp', 'ArrowUp')}
            label="▲"
          />
          <GamepadButton 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-white/30 rounded"
            onPressStart={handleTouchStart('ArrowDown', 'ArrowDown')}
            onPressEnd={handleTouchEnd('ArrowDown', 'ArrowDown')}
            label="▼"
          />
          <GamepadButton 
            className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/30 rounded"
            onPressStart={handleTouchStart('ArrowLeft', 'ArrowLeft')}
            onPressEnd={handleTouchEnd('ArrowLeft', 'ArrowLeft')}
            label="◀"
          />
          <GamepadButton 
            className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/30 rounded"
            onPressStart={handleTouchStart('ArrowRight', 'ArrowRight')}
            onPressEnd={handleTouchEnd('ArrowRight', 'ArrowRight')}
            label="▶"
          />
        </div>
      </div>

      {/* Action Buttons Container */}
      <div 
        className={`absolute w-40 h-32 pointer-events-auto
          ${isEditMode ? 'border-2 border-dashed border-yellow-400 bg-yellow-400/20' : ''}`}
        style={{ left: actionPos.x, top: actionPos.y }}
        onTouchMove={makeDraggable(setActionPos)}
      >
        <GamepadButton 
          className="absolute right-0 bottom-8 w-12 h-12 bg-red-500/50 rounded-full text-white font-bold"
          onPressStart={handleTouchStart('z', 'KeyZ')}
          onPressEnd={handleTouchEnd('z', 'KeyZ')}
          label="Z"
        />
        <GamepadButton 
          className="absolute right-14 bottom-0 w-12 h-12 bg-blue-500/50 rounded-full text-white font-bold"
          onPressStart={handleTouchStart('x', 'KeyX')}
          onPressEnd={handleTouchEnd('x', 'KeyX')}
          label="X"
        />
        <GamepadButton 
          className="absolute left-0 bottom-0 w-12 h-12 bg-green-500/50 rounded-full text-white font-bold text-xs"
          onPressStart={handleTouchStart('Shift', 'ShiftLeft')}
          onPressEnd={handleTouchEnd('Shift', 'ShiftLeft')}
          label="SHIFT"
        />
        <GamepadButton 
          className="absolute left-4 top-0 w-10 h-10 bg-gray-500/50 rounded-full text-white font-bold text-xs"
          onPressStart={handleTouchStart('Escape', 'Escape')}
          onPressEnd={handleTouchEnd('Escape', 'Escape')}
          label="ESC"
        />
      </div>
    </div>
  );
};

const GamepadButton: React.FC<{
  className: string;
  label: string;
  onPressStart: (e: any) => void;
  onPressEnd: (e: any) => void;
}> = ({ className, label, onPressStart, onPressEnd }) => (
  <button
    className={`${className} flex items-center justify-center select-none active:scale-90 transition-transform`}
    onTouchStart={onPressStart}
    onTouchEnd={onPressEnd}
    onMouseDown={onPressStart}
    onMouseUp={onPressEnd}
    onMouseLeave={onPressEnd}
    onContextMenu={(e) => e.preventDefault()}
  >
    {label}
  </button>
);

// Map keys to deprecated keyCodes required by older RPG Maker MV engines
function getKeyCode(key: string): number {
  switch(key.toLowerCase()) {
    case 'arrowup': return 38;
    case 'arrowdown': return 40;
    case 'arrowleft': return 37;
    case 'arrowright': return 39;
    case 'z': return 90;
    case 'x': return 88;
    case 'shift': return 16;
    case 'escape': return 27;
    default: return 0;
  }
}
