import { ImageStyle } from 'react-native';

export type OptimizedImageProps = {
  uri: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
};

export class ImageOptimizer {
  private cache: Map<string, string> = new Map();
  private readonly CDN_BASE_URL = 'https://cdn.houseparty.app';

  getOptimizedUrl({
    uri,
    width,
    height,
    quality = 80,
    format = 'jpeg',
  }: OptimizedImageProps): string {
    const cacheKey = `${uri}-${width}-${height}-${quality}-${format}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      const params = new URLSearchParams();
      if (width) params.append('w', width.toString());
      if (height) params.append('h', height.toString());
      params.append('q', quality.toString());
      params.append('f', format);

      const optimizedUrl = `${uri}?${params.toString()}`;
      this.cache.set(cacheKey, optimizedUrl);
      return optimizedUrl;
    }

    return uri;
  }

  preloadImages(uris: string[]): Promise<void[]> {
    console.log('[ImageOptimizer] Preloading', uris.length, 'images');
    return Promise.all(
      uris.map((uri) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = uri;
        });
      })
    );
  }

  clearCache(): void {
    this.cache.clear();
    console.log('[ImageOptimizer] Cache cleared');
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

export const imageOptimizer = new ImageOptimizer();

export const getResponsiveImageSize = (screenWidth: number): {
  thumbnail: number;
  small: number;
  medium: number;
  large: number;
} => {
  if (screenWidth < 375) {
    return {
      thumbnail: 64,
      small: 150,
      medium: 300,
      large: 600,
    };
  } else if (screenWidth < 768) {
    return {
      thumbnail: 80,
      small: 200,
      medium: 400,
      large: 800,
    };
  } else {
    return {
      thumbnail: 96,
      small: 250,
      medium: 500,
      large: 1000,
    };
  }
};
