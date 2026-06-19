export interface MathLibraryItem {
  id: string;
  image: string; // Base64 data URL or XML SVG data URI
  name: string;
  isPreset?: boolean;
}

const PRESET_MATH_ILLUSTRATIONS: MathLibraryItem[] = [
  {
    id: 'preset-chick',
    name: '🏆 Chú gà con',
    isPreset: true,
    image: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23FEF08A"/><circle cx="38" cy="43" r="5" fill="%23000000"/><circle cx="62" cy="43" r="5" fill="%23000000"/><path d="M40,52 Q50,68 60,52" stroke="%23F97316" stroke-width="4" fill="%23F97316"/><ellipse cx="50" cy="51" rx="5" ry="3" fill="%23F97316"/><path d="M50,5 L50,15" stroke="%23F97316" stroke-width="3"/><circle cx="28" cy="52" r="4" fill="%23FDA4AF"/><circle cx="72" cy="52" r="4" fill="%23FDA4AF"/></svg>`
  },
  {
    id: 'preset-balloon',
    name: '🎈 Bóng bay đỏ',
    isPreset: true,
    image: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="38" r="28" fill="%23EF4444"/><path d="M50,66 L50,92" stroke="%2394A3B8" stroke-width="3"/><path d="M47,66 L53,66 L50,71 Z" fill="%23EF4444"/><rect x="42" y="32" width="6" height="12" rx="3" fill="%23FF8A8A" transform="rotate(-30 45 38)"/></svg>`
  },
  {
    id: 'preset-lollipop',
    name: '🍭 Kẹo mút ngọt',
    isPreset: true,
    image: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="46" y="55" width="8" height="40" rx="4" fill="%23CBD5E1"/><circle cx="50" cy="32" r="28" fill="%23EC4899"/><path d="M50,4 A28,28 0 0,1 78,32 L50,32 Z" fill="%23F472B6"/><path d="M50,32 L22,32 A28,28 0 0,1 50,4 Z" fill="%2338BDF8"/><circle cx="50" cy="32" r="16" fill="%23FED7AA"/></svg>`
  },
  {
    id: 'preset-star',
    name: '⭐ Sao lấp lánh',
    isPreset: true,
    image: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36" fill="%23FACC15" stroke="%23EAB308" stroke-width="4" stroke-linejoin="round"/></svg>`
  },
  {
    id: 'preset-teddy',
    name: '🧸 Gấu bông',
    isPreset: true,
    image: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="30" cy="28" r="14" fill="%2392400E"/><circle cx="70" cy="28" r="14" fill="%2392400E"/><circle cx="30" cy="28" r="8" fill="%23FEF08A"/><circle cx="70" cy="28" r="8" fill="%23FEF08A"/><circle cx="50" cy="56" r="32" fill="%2392400E"/><circle cx="40" cy="48" r="4" fill="%23000000"/><circle cx="60" cy="48" r="4" fill="%23000000"/><ellipse cx="50" cy="61" rx="10" ry="8" fill="%23FEF08A"/><ellipse cx="50" cy="58" rx="4" ry="3" fill="%23000000"/></svg>`
  }
];

export function getMathIllustrations(): MathLibraryItem[] {
  try {
    const saved = localStorage.getItem('be_hoc_tieng_viet_math_library');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load math illustrations", e);
  }
  return [...PRESET_MATH_ILLUSTRATIONS];
}

export function saveMathIllustrations(items: MathLibraryItem[]) {
  try {
    localStorage.setItem('be_hoc_tieng_viet_math_library', JSON.stringify(items));
    // Dispatch local storage change event so other components sync instantly
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('math-library-updated'));
  } catch (e) {
    console.error("Failed to save math illustrations", e);
  }
}

export function compressImage(file: File, maxWidth: number = 256, maxHeight: number = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        try {
          // Standard transparent PNG at 256x256 is extremely lightweight 
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } catch (err) {
          resolve(e.target?.result as string); // fallback to raw base64
        }
      };
      img.onerror = () => {
        resolve(e.target?.result as string); // fallback to raw base64
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}
