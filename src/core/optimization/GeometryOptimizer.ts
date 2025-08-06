import * as THREE from "three";
import {
  TextureOptimizer,
  TextureOptimizationConfig,
} from "./TextureOptimizer";

export interface OptimizationConfig {
  // LOD配置
  enableLOD: boolean;
  lodLevels: number;
  lodDistances: number[];

  // 几何体简化配置
  enableSimplification: boolean;
  simplificationRatio: number; // 0.1 = 保留10%的面

  // 视锥剔除配置
  enableFrustumCulling: boolean;
  enableDistanceCulling: boolean;
  cullingDistance: number;

  // 实例化配置
  enableInstancing: boolean;
  minInstanceCount: number;

  // 纹理优化配置
  textureOptimization: Partial<TextureOptimizationConfig>;
}

export interface GeometryInfo {
  original: THREE.BufferGeometry;
  simplified: Map<number, THREE.BufferGeometry>; // LOD级别 -> 简化几何体
  triangleCount: number;
  vertexCount: number;
  isVisible: boolean;
  lastDistance: number;
  currentLOD: number;
}

/**
 * 几何体优化器
 * 负责减少三角面和顶点的渲染
 */
export class GeometryOptimizer {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer?: THREE.WebGLRenderer;
  private config: OptimizationConfig;
  private textureOptimizer?: TextureOptimizer;

  // 管理的几何体信息
  private geometryInfos = new Map<string, GeometryInfo>();

  // 统计信息
  private stats = {
    totalObjects: 0,
    visibleObjects: 0,
    totalTriangles: 0,
    renderedTriangles: 0,
    totalVertices: 0,
    renderedVertices: 0,
    culledObjects: 0,
    lodLevel0: 0,
    lodLevel1: 0,
    lodLevel2: 0,
    lodLevel3: 0,
  };

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer?: THREE.WebGLRenderer,
    config?: Partial<OptimizationConfig>
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.config = {
      enableLOD: true,
      lodLevels: 4,
      lodDistances: [100, 200, 500, 1000],
      enableSimplification: true,
      simplificationRatio: 0.5,
      enableFrustumCulling: true,
      enableDistanceCulling: true,
      cullingDistance: 5000,
      enableInstancing: false,
      minInstanceCount: 10,
      textureOptimization: {
        enableCompression: true,
        enableResolutionScaling: true,
        maxTextureSize: 1024,
        enableTextureCache: true,
        maxCacheSize: 256,
        enableMipmaps: true,
      },
      ...config,
    };

    // 初始化纹理优化器
    if (this.renderer) {
      this.textureOptimizer = new TextureOptimizer(
        this.renderer,
        this.config.textureOptimization
      );
    }
  }

  /**
   * 注册需要优化的对象
   */
  public registerObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const uuid = child.uuid;

        if (!this.geometryInfos.has(uuid)) {
          const geometryInfo: GeometryInfo = {
            original: child.geometry.clone(),
            simplified: new Map(),
            triangleCount: this.getTriangleCount(child.geometry),
            vertexCount: this.getVertexCount(child.geometry),
            isVisible: true,
            lastDistance: 0,
            currentLOD: 0,
          };

          this.geometryInfos.set(uuid, geometryInfo);

          // 预生成LOD几何体
          if (this.config.enableLOD && this.config.enableSimplification) {
            this.generateLODGeometries(child, geometryInfo);
          }

          // 优化材质纹理
          if (this.textureOptimizer && child.material) {
            this.optimizeMeshTextures(child, 0); // 默认LOD 0
          }

          console.log(`[GeometryOptimizer] 注册对象 ${child.name || uuid}:`, {
            triangles: geometryInfo.triangleCount,
            vertices: geometryInfo.vertexCount,
          });
        }
      }
    });
  }

  /**
   * 更新优化状态（在每帧调用）
   */
  public update(): void {
    this.resetStats();

    const cameraPosition = this.camera.position;
    const frustum = new THREE.Frustum();
    const cameraMatrix = new THREE.Matrix4();

    // 获取相机的投影矩阵
    if (this.camera instanceof THREE.PerspectiveCamera) {
      cameraMatrix.multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse
      );
    } else if (this.camera instanceof THREE.OrthographicCamera) {
      cameraMatrix.multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse
      );
    }

    frustum.setFromProjectionMatrix(cameraMatrix);

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry) {
        const uuid = object.uuid;
        const geometryInfo = this.geometryInfos.get(uuid);

        if (geometryInfo) {
          this.stats.totalObjects++;

          // 计算距离
          const distance = cameraPosition.distanceTo(object.position);
          geometryInfo.lastDistance = distance;

          // 视锥剔除
          let isVisible = true;
          if (this.config.enableFrustumCulling) {
            isVisible = this.isMeshInFrustum(object, frustum);
          }

          // 距离剔除
          if (
            this.config.enableDistanceCulling &&
            distance > this.config.cullingDistance
          ) {
            isVisible = false;
          }

          geometryInfo.isVisible = isVisible;
          object.visible = isVisible;

          if (isVisible) {
            this.stats.visibleObjects++;

            // LOD处理
            if (this.config.enableLOD) {
              this.updateObjectLOD(object, geometryInfo, distance);
            }

            // 更新统计信息
            this.updateStatsForObject(geometryInfo);
          } else {
            this.stats.culledObjects++;
          }
        }
      }
    });
  }

  /**
   * 优化网格的纹理
   */
  private optimizeMeshTextures(mesh: THREE.Mesh, lodLevel: number): void {
    if (!this.textureOptimizer || !mesh.material) return;

    if (Array.isArray(mesh.material)) {
      // 多材质
      mesh.material.forEach((material) => {
        this.textureOptimizer!.optimizeMaterial(material, lodLevel);
      });
    } else {
      // 单材质
      this.textureOptimizer.optimizeMaterial(mesh.material, lodLevel);
    }
  }

  /**
   * 生成LOD几何体
   */
  private generateLODGeometries(
    mesh: THREE.Mesh,
    geometryInfo: GeometryInfo
  ): void {
    const originalGeometry = geometryInfo.original;

    for (let i = 1; i < this.config.lodLevels; i++) {
      const simplificationRatio = Math.pow(this.config.simplificationRatio, i);
      const simplifiedGeometry = this.simplifyGeometry(
        originalGeometry,
        simplificationRatio
      );
      geometryInfo.simplified.set(i, simplifiedGeometry);

      console.log(
        `[GeometryOptimizer] 生成LOD${i} (简化率: ${simplificationRatio.toFixed(
          2
        )}):`,
        {
          原始三角形: this.getTriangleCount(originalGeometry),
          简化后三角形: this.getTriangleCount(simplifiedGeometry),
          减少: `${(100 * (1 - simplificationRatio)).toFixed(1)}%`,
        }
      );
    }
  }

  /**
   * 简化几何体（基础版本）
   */
  private simplifyGeometry(
    geometry: THREE.BufferGeometry,
    ratio: number
  ): THREE.BufferGeometry {
    // 简单的顶点抽取方法
    const originalPositions = geometry.getAttribute("position");
    const originalNormals = geometry.getAttribute("normal");
    const originalUvs = geometry.getAttribute("uv");
    const originalIndices = geometry.getIndex();

    if (!originalPositions || !originalIndices) {
      return geometry.clone();
    }

    const originalTriangleCount = originalIndices.count / 3;
    const targetTriangleCount = Math.max(
      1,
      Math.floor(originalTriangleCount * ratio)
    );

    // 简单的隔点采样方法（可以替换为更高级的算法）
    const step = Math.max(
      1,
      Math.floor(originalTriangleCount / targetTriangleCount)
    );

    const newIndices: number[] = [];
    const usedVertices = new Set<number>();

    for (let i = 0; i < originalIndices.count; i += step * 3) {
      if (i + 2 < originalIndices.count) {
        const a = originalIndices.getX(i);
        const b = originalIndices.getX(i + 1);
        const c = originalIndices.getX(i + 2);

        newIndices.push(a, b, c);
        usedVertices.add(a);
        usedVertices.add(b);
        usedVertices.add(c);
      }
    }

    const newGeometry = new THREE.BufferGeometry();

    // 复制属性
    newGeometry.setAttribute("position", originalPositions.clone());
    if (originalNormals) {
      newGeometry.setAttribute("normal", originalNormals.clone());
    }
    if (originalUvs) {
      newGeometry.setAttribute("uv", originalUvs.clone());
    }

    newGeometry.setIndex(newIndices);

    return newGeometry;
  }

  /**
   * 更新对象的LOD级别
   */
  private updateObjectLOD(
    mesh: THREE.Mesh,
    geometryInfo: GeometryInfo,
    distance: number
  ): void {
    let lodLevel = 0;

    // 确定LOD级别
    for (let i = 0; i < this.config.lodDistances.length; i++) {
      if (distance > this.config.lodDistances[i]) {
        lodLevel = i + 1;
      }
    }

    lodLevel = Math.min(lodLevel, this.config.lodLevels - 1);

    // 如果LOD级别改变，更新几何体
    if (lodLevel !== geometryInfo.currentLOD) {
      geometryInfo.currentLOD = lodLevel;

      if (lodLevel === 0) {
        mesh.geometry = geometryInfo.original;
      } else {
        const simplifiedGeometry = geometryInfo.simplified.get(lodLevel);
        if (simplifiedGeometry) {
          mesh.geometry = simplifiedGeometry;
        }
      }

      // 更新纹理LOD
      if (this.textureOptimizer) {
        this.optimizeMeshTextures(mesh, lodLevel);
      }
    }

    // 更新LOD统计
    switch (lodLevel) {
      case 0:
        this.stats.lodLevel0++;
        break;
      case 1:
        this.stats.lodLevel1++;
        break;
      case 2:
        this.stats.lodLevel2++;
        break;
      case 3:
        this.stats.lodLevel3++;
        break;
    }
  }

  /**
   * 检查网格是否在视锥内
   */
  private isMeshInFrustum(mesh: THREE.Mesh, frustum: THREE.Frustum): boolean {
    // 计算边界盒
    if (!mesh.geometry.boundingBox) {
      mesh.geometry.computeBoundingBox();
    }

    const boundingBox = mesh.geometry.boundingBox!.clone();
    boundingBox.applyMatrix4(mesh.matrixWorld);

    return frustum.intersectsBox(boundingBox);
  }

  /**
   * 获取三角形数量
   */
  private getTriangleCount(geometry: THREE.BufferGeometry): number {
    const index = geometry.getIndex();
    if (index) {
      return index.count / 3;
    } else {
      const position = geometry.getAttribute("position");
      return position ? position.count / 3 : 0;
    }
  }

  /**
   * 获取顶点数量
   */
  private getVertexCount(geometry: THREE.BufferGeometry): number {
    const position = geometry.getAttribute("position");
    return position ? position.count : 0;
  }

  /**
   * 重置统计信息
   */
  private resetStats(): void {
    this.stats.totalObjects = 0;
    this.stats.visibleObjects = 0;
    this.stats.totalTriangles = 0;
    this.stats.renderedTriangles = 0;
    this.stats.totalVertices = 0;
    this.stats.renderedVertices = 0;
    this.stats.culledObjects = 0;
    this.stats.lodLevel0 = 0;
    this.stats.lodLevel1 = 0;
    this.stats.lodLevel2 = 0;
    this.stats.lodLevel3 = 0;
  }

  /**
   * 更新对象的统计信息
   */
  private updateStatsForObject(geometryInfo: GeometryInfo): void {
    this.stats.totalTriangles += geometryInfo.triangleCount;
    this.stats.totalVertices += geometryInfo.vertexCount;

    if (geometryInfo.isVisible) {
      const currentGeometry =
        geometryInfo.currentLOD === 0
          ? geometryInfo.original
          : geometryInfo.simplified.get(geometryInfo.currentLOD);

      if (currentGeometry) {
        this.stats.renderedTriangles += this.getTriangleCount(currentGeometry);
        this.stats.renderedVertices += this.getVertexCount(currentGeometry);
      }
    }
  }

  /**
   * 获取优化统计信息
   */
  public getStats() {
    const triangleReduction =
      this.stats.totalTriangles > 0
        ? (1 - this.stats.renderedTriangles / this.stats.totalTriangles) * 100
        : 0;

    const vertexReduction =
      this.stats.totalVertices > 0
        ? (1 - this.stats.renderedVertices / this.stats.totalVertices) * 100
        : 0;

    const baseStats = {
      ...this.stats,
      triangleReduction: triangleReduction.toFixed(1) + "%",
      vertexReduction: vertexReduction.toFixed(1) + "%",
      cullingRatio:
        this.stats.totalObjects > 0
          ? (
              (this.stats.culledObjects / this.stats.totalObjects) *
              100
            ).toFixed(1) + "%"
          : "0%",
    };

    // 添加纹理优化统计
    if (this.textureOptimizer) {
      const textureStats = this.textureOptimizer.getStats();
      return {
        ...baseStats,
        textureStats: {
          totalTextures: textureStats.totalTextures,
          memoryUsageMB: textureStats.memoryUsageMB,
          compressionRatio:
            (textureStats.compressionRatio * 100).toFixed(1) + "%",
          cacheHitRate: (textureStats.cacheHitRate * 100).toFixed(1) + "%",
          mipmapTextures: textureStats.mipmapTextures,
        },
      };
    }

    return baseStats;
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // 更新纹理优化器配置
    if (this.textureOptimizer && newConfig.textureOptimization) {
      this.textureOptimizer.updateConfig(newConfig.textureOptimization);
    }

    console.log("[GeometryOptimizer] 配置已更新:", this.config);
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    this.geometryInfos.forEach((info) => {
      info.simplified.forEach((geometry) => {
        geometry.dispose();
      });
    });
    this.geometryInfos.clear();

    // 清理纹理优化器
    if (this.textureOptimizer) {
      this.textureOptimizer.dispose();
      this.textureOptimizer = undefined;
    }

    console.log("[GeometryOptimizer] 资源已清理");
  }
}
