import * as THREE from "three";
import { AnnotationConfig } from "@/components/annotation/AnnotationConfigModal";

export interface SerializedAnnotationData {
  id: string;
  config: AnnotationConfig;
  position: {
    x: number;
    y: number;
    z: number;
  };
  objectUuid?: string; // 用于标识关联的3D对象
  objectData?: {
    name?: string;
    type?: string;
    // 可以添加更多对象标识信息
  };
}

export interface ModelAnnotations {
  modelId: string;
  modelPath: string;
  annotations: SerializedAnnotationData[];
  timestamp: number;
}

/**
 * 批注本地存储管理器
 * 负责批注数据的保存、加载和管理
 */
export default class AnnotationStorageManager {
  private static readonly STORAGE_KEY = "model_annotations";
  private static readonly MAX_STORAGE_SIZE = 50; // 最多保存50个模型的批注

  /**
   * 保存模型的批注数据
   */
  static saveModelAnnotations(
    modelId: string,
    modelPath: string,
    annotations: SerializedAnnotationData[]
  ): void {
    try {
      const storage = this.getStorage();

      // 查找是否已存在该模型的批注
      const existingIndex = storage.findIndex(
        (item) => item.modelId === modelId
      );

      const modelAnnotations: ModelAnnotations = {
        modelId,
        modelPath,
        annotations,
        timestamp: Date.now(),
      };

      if (existingIndex >= 0) {
        // 更新现有记录
        storage[existingIndex] = modelAnnotations;
      } else {
        // 添加新记录
        storage.unshift(modelAnnotations);

        // 如果超过最大存储数量，删除最旧的记录
        if (storage.length > this.MAX_STORAGE_SIZE) {
          storage.splice(this.MAX_STORAGE_SIZE);
        }
      }

      this.setStorage(storage);
      console.log(
        `[AnnotationStorageManager] 已保存模型 ${modelId} 的 ${annotations.length} 个批注`
      );
    } catch (error) {
      console.error("[AnnotationStorageManager] 保存批注失败:", error);
    }
  }

  /**
   * 加载模型的批注数据
   */
  static loadModelAnnotations(modelId: string): SerializedAnnotationData[] {
    try {
      const storage = this.getStorage();
      const modelAnnotations = storage.find((item) => item.modelId === modelId);

      if (modelAnnotations) {
        console.log(
          `[AnnotationStorageManager] 加载模型 ${modelId} 的 ${modelAnnotations.annotations.length} 个批注`
        );
        return modelAnnotations.annotations;
      }

      console.log(
        `[AnnotationStorageManager] 未找到模型 ${modelId} 的批注数据`
      );
      return [];
    } catch (error) {
      console.error("[AnnotationStorageManager] 加载批注失败:", error);
      return [];
    }
  }

  /**
   * 删除模型的批注数据
   */
  static deleteModelAnnotations(modelId: string): void {
    try {
      const storage = this.getStorage();
      const filteredStorage = storage.filter(
        (item) => item.modelId !== modelId
      );
      this.setStorage(filteredStorage);
      console.log(
        `[AnnotationStorageManager] 已删除模型 ${modelId} 的批注数据`
      );
    } catch (error) {
      console.error("[AnnotationStorageManager] 删除批注失败:", error);
    }
  }

  /**
   * 获取所有保存的模型批注信息
   */
  static getAllModelAnnotations(): ModelAnnotations[] {
    try {
      return this.getStorage();
    } catch (error) {
      console.error("[AnnotationStorageManager] 获取批注列表失败:", error);
      return [];
    }
  }

  /**
   * 清空所有批注存储
   */
  static clearAllAnnotations(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log("[AnnotationStorageManager] 已清空所有批注存储");
    } catch (error) {
      console.error("[AnnotationStorageManager] 清空批注存储失败:", error);
    }
  }

  /**
   * 从3D对象生成唯一标识
   */
  static generateObjectIdentifier(object: THREE.Object3D): string {
    // 使用对象的UUID，如果没有则使用name和type的组合
    if (object.uuid) {
      return object.uuid;
    }

    const name = object.name || "unnamed";
    const type = object.type || "Object3D";
    return `${type}_${name}_${object.id}`;
  }

  /**
   * 从模型路径生成模型ID
   */
  static generateModelId(modelPath: string): string {
    // 移除查询参数和片段标识符，只保留主要路径
    const cleanPath = modelPath.split("?")[0].split("#")[0];

    // 如果是URL，提取文件名部分
    const pathParts = cleanPath.split("/");
    const fileName = pathParts[pathParts.length - 1] || cleanPath;

    // 生成基于文件名的哈希ID（简单方式）
    let hash = 0;
    for (let i = 0; i < fileName.length; i++) {
      const char = fileName.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }

    return `model_${Math.abs(hash)}_${fileName.replace(/[^a-zA-Z0-9]/g, "_")}`;
  }

  /**
   * 序列化批注数据（转换为可存储的格式）
   */
  static serializeAnnotation(
    id: string,
    config: AnnotationConfig,
    position: THREE.Vector3,
    object: THREE.Object3D
  ): SerializedAnnotationData {
    return {
      id,
      config: { ...config },
      position: {
        x: position.x,
        y: position.y,
        z: position.z,
      },
      objectUuid: object.uuid,
      objectData: {
        name: object.name,
        type: object.type,
      },
    };
  }

  /**
   * 检查本地存储是否可用
   */
  static isStorageAvailable(): boolean {
    try {
      const test = "__storage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      console.warn("[AnnotationStorageManager] 本地存储不可用:", error);
      return false;
    }
  }

  /**
   * 获取存储的大小信息
   */
  static getStorageInfo(): { count: number; sizeKB: number } {
    try {
      const storage = this.getStorage();
      const jsonString = JSON.stringify(storage);
      return {
        count: storage.length,
        sizeKB: Math.round((jsonString.length * 2) / 1024), // 粗略估算（UTF-16）
      };
    } catch (error) {
      console.error("[AnnotationStorageManager] 获取存储信息失败:", error);
      return { count: 0, sizeKB: 0 };
    }
  }

  /**
   * 从本地存储获取数据
   */
  private static getStorage(): ModelAnnotations[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) {
      return [];
    }
    return JSON.parse(data);
  }

  /**
   * 保存数据到本地存储
   */
  private static setStorage(data: ModelAnnotations[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }
}
