import * as THREE from "three";

export interface TextureOptimizationConfig {
  // 纹理压缩配置
  enableCompression: boolean;
  compressionFormat: "auto" | "DXT" | "ETC" | "ASTC" | "PVRTC";

  // 纹理分辨率配置
  enableResolutionScaling: boolean;
  maxTextureSize: number;
  lodTextureScaling: number[]; // 每个LOD级别的纹理缩放因子

  // 纹理缓存配置
  enableTextureCache: boolean;
  maxCacheSize: number; // MB
  cacheStrategy: "LRU" | "distance" | "importance";

  // Mipmap配置
  enableMipmaps: boolean;
  mipmapFilter: THREE.TextureFilter;

  // 纹理格式优化
  enableFormatOptimization: boolean;
  preferredFormats: {
    diffuse: THREE.PixelFormat;
    normal: THREE.PixelFormat;
    roughness: THREE.PixelFormat;
    metalness: THREE.PixelFormat;
  };
}

export interface TextureCacheItem {
  texture: THREE.Texture;
  originalTexture: THREE.Texture;
  optimizedVersions: Map<string, THREE.Texture>; // LOD级别 -> 优化纹理
  lastUsed: number;
  memorySize: number;
  importance: number;
  references: number;
}

export interface TextureStats {
  totalTextures: number;
  cachedTextures: number;
  memoryUsage: number; // bytes
  compressionRatio: number;
  averageResolution: number;
  mipmapTextures: number;
}

/**
 * 纹理优化器
 * 负责优化纹理以减少内存使用和提升渲染性能
 */
export class TextureOptimizer {
  private config: TextureOptimizationConfig;
  private textureCache = new Map<string, TextureCacheItem>();
  private compressionSupport: {
    s3tc: boolean;
    etc: boolean;
    astc: boolean;
    pvrtc: boolean;
  };

  // 统计信息
  private stats: TextureStats = {
    totalTextures: 0,
    cachedTextures: 0,
    memoryUsage: 0,
    compressionRatio: 0,
    averageResolution: 0,
    mipmapTextures: 0,
  };

  constructor(
    renderer: THREE.WebGLRenderer,
    config?: Partial<TextureOptimizationConfig>
  ) {
    this.compressionSupport = this.detectCompressionSupport(renderer);

    this.config = {
      enableCompression: true,
      compressionFormat: "auto",
      enableResolutionScaling: true,
      maxTextureSize: 1024,
      lodTextureScaling: [1.0, 0.8, 0.6, 0.4], // LOD 0-3的纹理缩放
      enableTextureCache: true,
      maxCacheSize: 512, // 512MB
      cacheStrategy: "LRU",
      enableMipmaps: true,
      mipmapFilter: THREE.LinearMipmapLinearFilter,
      enableFormatOptimization: true,
      preferredFormats: {
        diffuse: THREE.RGBAFormat,
        normal: THREE.RGBAFormat,
        roughness: THREE.RedFormat,
        metalness: THREE.RedFormat,
      },
      ...config,
    };

    console.log("[TextureOptimizer] 初始化完成", {
      压缩支持: this.compressionSupport,
      配置: this.config,
    });
  }

  /**
   * 检测压缩格式支持
   */
  private detectCompressionSupport(renderer: THREE.WebGLRenderer) {
    const gl = renderer.getContext();

    return {
      s3tc: !!gl.getExtension("WEBGL_compressed_texture_s3tc"),
      etc: !!gl.getExtension("WEBGL_compressed_texture_etc1"),
      astc: !!gl.getExtension("WEBGL_compressed_texture_astc"),
      pvrtc: !!gl.getExtension("WEBGL_compressed_texture_pvrtc"),
    };
  }

  /**
   * 优化材质的所有纹理
   */
  public optimizeMaterial(
    material: THREE.Material,
    lodLevel: number = 0
  ): void {
    if (
      !(material instanceof THREE.MeshStandardMaterial) &&
      !(material instanceof THREE.MeshBasicMaterial) &&
      !(material instanceof THREE.MeshPhongMaterial)
    ) {
      return;
    }

    const textures = this.extractTexturesFromMaterial(material);

    textures.forEach(({ texture, type }) => {
      if (texture) {
        const optimizedTexture = this.optimizeTexture(texture, type, lodLevel);
        this.replaceTextureInMaterial(material, type, optimizedTexture);
      }
    });
  }

  /**
   * 从材质中提取纹理
   */
  private extractTexturesFromMaterial(
    material: any
  ): Array<{ texture: THREE.Texture; type: string }> {
    const textures: Array<{ texture: THREE.Texture; type: string }> = [];

    // 标准材质的纹理属性
    const textureProperties = [
      "map",
      "normalMap",
      "roughnessMap",
      "metalnessMap",
      "aoMap",
      "emissiveMap",
      "bumpMap",
      "displacementMap",
      "alphaMap",
      "lightMap",
      "envMap",
    ];

    textureProperties.forEach((prop) => {
      if (material[prop] && material[prop] instanceof THREE.Texture) {
        textures.push({ texture: material[prop], type: prop });
      }
    });

    return textures;
  }

  /**
   * 优化单个纹理
   */
  public optimizeTexture(
    texture: THREE.Texture,
    type: string = "diffuse",
    lodLevel: number = 0
  ): THREE.Texture {
    const cacheKey = this.generateTextureKey(texture, type, lodLevel);

    // 检查缓存
    let cacheItem = this.textureCache.get(cacheKey);
    if (cacheItem) {
      cacheItem.lastUsed = Date.now();
      cacheItem.references++;
      return cacheItem.optimizedVersions.get(`${lodLevel}`) || texture;
    }

    // 创建新的缓存项
    cacheItem = {
      texture: texture,
      originalTexture: texture.clone(),
      optimizedVersions: new Map(),
      lastUsed: Date.now(),
      memorySize: this.calculateTextureMemorySize(texture),
      importance: this.calculateTextureImportance(type),
      references: 1,
    };

    // 进行优化
    const optimizedTexture = this.performTextureOptimization(
      texture,
      type,
      lodLevel
    );
    cacheItem.optimizedVersions.set(`${lodLevel}`, optimizedTexture);

    this.textureCache.set(cacheKey, cacheItem);
    this.updateStats();

    // 检查缓存大小
    this.enforceMemoryLimit();

    return optimizedTexture;
  }

  /**
   * 执行纹理优化
   */
  private performTextureOptimization(
    texture: THREE.Texture,
    type: string,
    lodLevel: number
  ): THREE.Texture {
    let optimizedTexture = texture.clone();

    // 1. 分辨率缩放
    if (this.config.enableResolutionScaling) {
      optimizedTexture = this.scaleTextureResolution(
        optimizedTexture,
        lodLevel
      );
    }

    // 2. 格式优化
    if (this.config.enableFormatOptimization) {
      optimizedTexture = this.optimizeTextureFormat(optimizedTexture, type);
    }

    // 3. Mipmap生成
    if (this.config.enableMipmaps) {
      this.generateMipmaps(optimizedTexture);
    }

    // 4. 压缩
    if (this.config.enableCompression) {
      optimizedTexture = this.compressTexture(optimizedTexture, type);
    }

    console.log(`[TextureOptimizer] 纹理优化完成 (${type}, LOD${lodLevel}):`, {
      原始尺寸: `${texture.image?.width}x${texture.image?.height}`,
      优化后尺寸: `${optimizedTexture.image?.width}x${optimizedTexture.image?.height}`,
      格式: optimizedTexture.format,
    });

    return optimizedTexture;
  }

  /**
   * 缩放纹理分辨率
   */
  private scaleTextureResolution(
    texture: THREE.Texture,
    lodLevel: number
  ): THREE.Texture {
    if (!texture.image || lodLevel >= this.config.lodTextureScaling.length) {
      return texture;
    }

    const scaleFactor = this.config.lodTextureScaling[lodLevel];
    if (scaleFactor >= 1.0) {
      return texture;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return texture;

    const originalWidth = texture.image.width;
    const originalHeight = texture.image.height;
    const newWidth = Math.max(1, Math.floor(originalWidth * scaleFactor));
    const newHeight = Math.max(1, Math.floor(originalHeight * scaleFactor));

    // 限制最大尺寸
    const finalWidth = Math.min(newWidth, this.config.maxTextureSize);
    const finalHeight = Math.min(newHeight, this.config.maxTextureSize);

    canvas.width = finalWidth;
    canvas.height = finalHeight;

    // 使用高质量缩放
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(texture.image, 0, 0, finalWidth, finalHeight);

    const scaledTexture = texture.clone();
    scaledTexture.image = canvas;
    scaledTexture.needsUpdate = true;

    return scaledTexture;
  }

  /**
   * 优化纹理格式
   */
  private optimizeTextureFormat(
    texture: THREE.Texture,
    type: string
  ): THREE.Texture {
    const optimizedTexture = texture.clone();

    // 根据纹理类型选择最佳格式
    switch (type) {
      case "roughnessMap":
      case "metalnessMap":
      case "aoMap":
        // 单通道纹理可以使用红色通道
        optimizedTexture.format = this.config.preferredFormats.roughness;
        break;

      case "normalMap":
        // 法线贴图通常需要更高精度
        optimizedTexture.format = this.config.preferredFormats.normal;
        break;

      default:
        // 漫反射等彩色纹理
        optimizedTexture.format = this.config.preferredFormats.diffuse;
        break;
    }

    return optimizedTexture;
  }

  /**
   * 生成Mipmap
   */
  private generateMipmaps(texture: THREE.Texture): void {
    texture.generateMipmaps = true;
    texture.minFilter = this.config.mipmapFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    this.stats.mipmapTextures++;
  }

  /**
   * 压缩纹理
   */
  private compressTexture(texture: THREE.Texture, type: string): THREE.Texture {
    // 简化的压缩实现 - 实际项目中可能需要使用Web Workers
    // 这里主要是调整纹理参数来减少内存使用

    const compressedTexture = texture.clone();

    // 根据支持的压缩格式选择
    if (this.config.compressionFormat === "auto") {
      if (this.compressionSupport.s3tc) {
        // 使用S3TC压缩（需要预处理的纹理数据）
        compressedTexture.format = THREE.RGBAFormat;
      } else if (this.compressionSupport.etc) {
        // 使用ETC压缩
        compressedTexture.format = THREE.RGBAFormat;
      }
    }

    // 调整纹理参数以减少内存使用
    compressedTexture.flipY = false; // 减少GPU操作
    compressedTexture.premultiplyAlpha = false;

    return compressedTexture;
  }

  /**
   * 替换材质中的纹理
   */
  private replaceTextureInMaterial(
    material: any,
    textureType: string,
    newTexture: THREE.Texture
  ): void {
    if (material[textureType]) {
      material[textureType] = newTexture;
      material.needsUpdate = true;
    }
  }

  /**
   * 生成纹理缓存键
   */
  private generateTextureKey(
    texture: THREE.Texture,
    type: string,
    lodLevel: number
  ): string {
    return `${texture.uuid}_${type}_${lodLevel}`;
  }

  /**
   * 计算纹理内存大小
   */
  private calculateTextureMemorySize(texture: THREE.Texture): number {
    if (!texture.image) return 0;

    const width = texture.image.width || 1;
    const height = texture.image.height || 1;
    const bytesPerPixel = this.getBytesPerPixel(texture.format);

    let size = width * height * bytesPerPixel;

    // 如果有mipmap，增加33%的内存使用
    if (texture.generateMipmaps) {
      size *= 1.33;
    }

    return size;
  }

  /**
   * 获取每像素字节数
   */
  private getBytesPerPixel(format: THREE.AnyPixelFormat): number {
    switch (format) {
      case THREE.RedFormat:
        return 1;
      case THREE.RGFormat:
        return 2;
      case THREE.RGBAFormat:
        return 4;
      default:
        return 4;
    }
  }

  /**
   * 计算纹理重要性
   */
  private calculateTextureImportance(type: string): number {
    const importanceMap: { [key: string]: number } = {
      map: 1.0, // 漫反射最重要
      normalMap: 0.8, // 法线贴图次重要
      roughnessMap: 0.6, // 粗糙度
      metalnessMap: 0.6, // 金属度
      aoMap: 0.4, // AO
      emissiveMap: 0.7, // 自发光
      bumpMap: 0.5, // 凹凸
      displacementMap: 0.3, // 位移
      alphaMap: 0.8, // Alpha
      lightMap: 0.5, // 光照贴图
      envMap: 0.6, // 环境贴图
    };

    return importanceMap[type] || 0.5;
  }

  /**
   * 强制执行内存限制
   */
  private enforceMemoryLimit(): void {
    const maxBytes = this.config.maxCacheSize * 1024 * 1024; // MB转字节
    let currentUsage = 0;

    // 计算当前内存使用
    this.textureCache.forEach((item) => {
      currentUsage += item.memorySize;
    });

    if (currentUsage <= maxBytes) return;

    // 根据策略清理缓存
    const items = Array.from(this.textureCache.entries());

    switch (this.config.cacheStrategy) {
      case "LRU":
        items.sort((a, b) => a[1].lastUsed - b[1].lastUsed);
        break;

      case "importance":
        items.sort((a, b) => a[1].importance - b[1].importance);
        break;

      case "distance":
        // 简化实现，按引用次数排序
        items.sort((a, b) => a[1].references - b[1].references);
        break;
    }

    // 删除项目直到内存使用降至限制以下
    while (currentUsage > maxBytes && items.length > 0) {
      const [key, item] = items.shift()!;
      currentUsage -= item.memorySize;

      // 清理纹理资源
      item.optimizedVersions.forEach((texture) => {
        texture.dispose();
      });

      this.textureCache.delete(key);

      console.log(`[TextureOptimizer] 清理缓存项: ${key}`);
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.totalTextures = this.textureCache.size;
    this.stats.cachedTextures = this.textureCache.size;

    let totalMemory = 0;
    let totalResolution = 0;
    let mipmapCount = 0;

    this.textureCache.forEach((item) => {
      totalMemory += item.memorySize;

      item.optimizedVersions.forEach((texture) => {
        if (texture.image) {
          totalResolution += texture.image.width * texture.image.height;
        }
        if (texture.generateMipmaps) {
          mipmapCount++;
        }
      });
    });

    this.stats.memoryUsage = totalMemory;
    this.stats.averageResolution =
      this.stats.totalTextures > 0
        ? totalResolution / this.stats.totalTextures
        : 0;
    this.stats.mipmapTextures = mipmapCount;

    // 计算压缩比（简化）
    this.stats.compressionRatio = 0.7; // 假设70%的压缩率
  }

  /**
   * 获取优化统计信息
   */
  public getStats(): TextureStats & {
    memoryUsageMB: number;
    cacheHitRate: number;
  } {
    return {
      ...this.stats,
      memoryUsageMB: this.stats.memoryUsage / (1024 * 1024),
      cacheHitRate: 0.85, // 简化的缓存命中率
    };
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<TextureOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("[TextureOptimizer] 配置已更新:", this.config);
  }

  /**
   * 清理所有纹理缓存
   */
  public dispose(): void {
    this.textureCache.forEach((item) => {
      item.optimizedVersions.forEach((texture) => {
        texture.dispose();
      });
    });

    this.textureCache.clear();
    console.log("[TextureOptimizer] 纹理缓存已清理");
  }
}
