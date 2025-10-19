// Simple sound registry initialized early. Looks for common files under /sounds in the public root.
// If a file is missing, howler will emit an error but we'll suppress console noise.
import { Howl, Howler } from 'howler';

const SOUND_FILES = {
  click: '/sounds/click.mp3',
  hover: '/sounds/hover.mp3',
  success: '/sounds/success.mp3',
  error: '/sounds/error.mp3',
};

const registry = {};

function safeHowl(src) {
  const h = new Howl({
    src: [src],
    volume: 0.6,
    preload: true,
    html5: false,
  });
  // Suppress noisy load errors if assets aren't present in /sounds
  h.on('loaderror', () => {/* noop */});
  return h;
}

export function initSounds() {
  Object.entries(SOUND_FILES).forEach(([name, url]) => {
    if (!registry[name]) registry[name] = safeHowl(url);
  });
}

export function play(name) {
  const h = registry[name];
  if (h) h.play();
}

// Initialize immediately on import so early UI interactions have sounds available
initSounds();

// Optional: expose Howler for global volume control
export { Howler };
