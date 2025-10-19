// Utility for playing sound effects

// Preload audio files for better performance
const audioCache: Map<string, HTMLAudioElement> = new Map();

const preloadSound = (path: string) => {
  if (!audioCache.has(path)) {
    const audio = new Audio(path);
    audio.preload = 'auto';
    audioCache.set(path, audio);
  }
};

// Preload all sounds when the module is loaded
preloadSound('/assets/audio/cardSlide2.ogg');
preloadSound('/assets/audio/card1.ogg');
preloadSound('/assets/audio/button.ogg');

export const playSound = (soundName: 'cardHover' | 'cardPlay' | 'button') => {
  try {
    const soundPaths = {
      cardHover: '/assets/audio/cardSlide2.ogg',
      cardPlay: '/assets/audio/card1.ogg',
      button: '/assets/audio/button.ogg',
    };

    const soundVolumes = {
      cardHover: 0.3, // 30% volume
      cardPlay: 0.5,  // 50% volume
      button: 0.5,    // 50% volume
    };

    const path = soundPaths[soundName];
    const cachedAudio = audioCache.get(path);
    
    if (cachedAudio) {
      // Clone the audio element to allow overlapping sounds
      const audio = cachedAudio.cloneNode() as HTMLAudioElement;
      audio.volume = soundVolumes[soundName];
      audio.play().catch(err => {
        console.warn('Failed to play sound:', err);
      });
    }
  } catch (error) {
    console.warn('Error playing sound:', error);
  }
};

