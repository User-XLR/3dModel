import * as THREE from "three";
import { AnnotationConfig } from "@/components/annotation/AnnotationConfigModal";
import AnnotationStorageManager, {
  SerializedAnnotationData,
} from "./AnnotationStorageManager";

export interface AnnotationData {
  id: string;
  config: AnnotationConfig;
  position: THREE.Vector3;
  object: THREE.Object3D;
  label?: HTMLElement;
}

export default class AnnotationManager {
  private annotations: Map<string, AnnotationData> = new Map();
  private container?: HTMLElement;
  private viewer?: any;
  private currentModelId?: string;
  private currentModelPath?: string;
  private autoSaveEnabled: boolean = true;

  constructor(viewer: any, container: HTMLElement) {
    this.viewer = viewer;
    this.container = container;
  }

  /**
   * 创建新的注释
   */
  createAnnotation(
    object: THREE.Object3D,
    position: THREE.Vector3,
    config: AnnotationConfig
  ): string {
    const id = `annotation_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const annotationData: AnnotationData = {
      id,
      config,
      position: position.clone(),
      object,
    };

    this.annotations.set(id, annotationData);
    this.createLabel(annotationData);

    // 自动保存到本地存储
    if (this.autoSaveEnabled) {
      this.saveToLocalStorage();
    }

    return id;
  }

  /**
   * 创建指示牌标签
   */
  private createLabel(annotationData: AnnotationData) {
    if (!this.container) return;

    const label = document.createElement("div");
    label.className = "annotation-label";
    label.style.position = "absolute";
    label.style.pointerEvents = "none";
    label.style.zIndex = "1000";
    label.style.display = "none";

    // 创建标签内容
    const typeIcon = this.getTypeIcon(annotationData.config.type);
    const priorityColor = this.getPriorityColor(annotationData.config.priority);

    label.innerHTML = `
      <div style="
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
        padding: 12px;
        min-width: 200px;
        max-width: 300px;
        border: 2px solid ${annotationData.config.color};
        position: relative;
        transform: translate(-50%, -100%);
        margin-top: -10px;
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        ">
          <span style="font-size: 16px; flex-shrink: 0;">${typeIcon}</span>
          <span style="
            font-size: 14px;
            font-weight: 600;
            color: #303133;
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          ">${annotationData.config.title}</span>
          <div style="
            color: white;
            font-size: 10px;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 10px;
            min-width: 16px;
            text-align: center;
            flex-shrink: 0;
            background-color: ${priorityColor};
          ">${annotationData.config.priority}</div>
        </div>
        ${
          annotationData.config.description
            ? `
          <div style="
            font-size: 12px;
            color: #606266;
            line-height: 1.4;
            word-break: break-word;
          ">${annotationData.config.description}</div>
        `
            : ""
        }
        <div style="
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 8px solid transparent;
          border-top-color: ${annotationData.config.color};
        "></div>
      </div>
    `;

    this.container.appendChild(label);
    annotationData.label = label;

    // 更新标签位置
    this.updateLabelPosition(annotationData);
  }

  /**
   * 更新标签位置
   */
  private updateLabelPosition(annotationData: AnnotationData) {
    if (
      !annotationData.label ||
      !this.viewer?.camera ||
      !this.viewer?.renderer
    ) {
      return;
    }

    const vector = annotationData.position.clone();
    vector.project(this.viewer.camera);

    // 检查对象是否在相机背后或者被裁剪
    // 投影后 z > 1 表示对象在相机背后，z < -1 表示对象在近裁剪面前
    if (vector.z > 1 || vector.z < -1) {
      annotationData.label.style.display = "none";
      return;
    }

    // 检查投影点是否在屏幕范围内（包含一定的边界容差）
    const margin = 0.1; // 10% 的边界容差，使批注在屏幕边缘时有更好的显示体验
    if (
      vector.x < -(1 + margin) ||
      vector.x > 1 + margin ||
      vector.y < -(1 + margin) ||
      vector.y > 1 + margin
    ) {
      annotationData.label.style.display = "none";
      return;
    }

    const x =
      (vector.x * 0.5 + 0.5) * this.viewer.renderer.domElement.clientWidth;
    const y =
      (-(vector.y * 0.5) + 0.5) * this.viewer.renderer.domElement.clientHeight;

    annotationData.label.style.left = x + "px";
    annotationData.label.style.top = y + "px";
    annotationData.label.style.display = "block";
  }

  /**
   * 更新所有标签位置
   */
  updateAllLabels() {
    this.annotations.forEach((annotationData) => {
      this.updateLabelPosition(annotationData);
    });
  }

  /**
   * 删除注释
   */
  removeAnnotation(id: string) {
    const annotationData = this.annotations.get(id);
    if (annotationData && annotationData.label) {
      this.container?.removeChild(annotationData.label);
    }
    this.annotations.delete(id);

    // 自动保存到本地存储
    if (this.autoSaveEnabled) {
      this.saveToLocalStorage();
    }
  }

  /**
   * 删除所有注释
   */
  clearAllAnnotations() {
    this.annotations.forEach((annotationData) => {
      if (annotationData.label) {
        this.container?.removeChild(annotationData.label);
      }
    });
    this.annotations.clear();

    // 自动保存到本地存储
    if (this.autoSaveEnabled) {
      this.saveToLocalStorage();
    }
  }

  /**
   * 获取类型图标
   */
  private getTypeIcon(type: string): string {
    switch (type) {
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      case "success":
        return "✅";
      default:
        return "ℹ️";
    }
  }

  /**
   * 获取优先级颜色
   */
  private getPriorityColor(priority: number): string {
    switch (priority) {
      case 1:
        return "#67c23a";
      case 2:
        return "#e6a23c";
      case 3:
        return "#f56c6c";
      case 4:
        return "#f56c6c";
      default:
        return "#409eff";
    }
  }

  /**
   * 获取所有注释
   */
  getAllAnnotations(): AnnotationData[] {
    return Array.from(this.annotations.values());
  }

  /**
   * 根据对象获取注释
   */
  getAnnotationsByObject(object: THREE.Object3D): AnnotationData[] {
    return Array.from(this.annotations.values()).filter(
      (annotation) => annotation.object === object
    );
  }

  /**
   * 设置当前模型信息
   */
  setCurrentModel(modelPath: string): void {
    this.currentModelPath = modelPath;
    this.currentModelId = AnnotationStorageManager.generateModelId(modelPath);
    console.log(
      `[AnnotationManager] 设置当前模型: ${this.currentModelId} (${modelPath})`
    );
  }

  /**
   * 保存批注到本地存储
   */
  saveToLocalStorage(): void {
    if (!this.currentModelId || !this.currentModelPath) {
      console.warn("[AnnotationManager] 无法保存批注：未设置当前模型信息");
      return;
    }

    if (!AnnotationStorageManager.isStorageAvailable()) {
      console.warn("[AnnotationManager] 本地存储不可用，无法保存批注");
      return;
    }

    try {
      const serializedAnnotations: SerializedAnnotationData[] = [];

      this.annotations.forEach((annotationData) => {
        const serialized = AnnotationStorageManager.serializeAnnotation(
          annotationData.id,
          annotationData.config,
          annotationData.position,
          annotationData.object
        );
        serializedAnnotations.push(serialized);
      });

      AnnotationStorageManager.saveModelAnnotations(
        this.currentModelId,
        this.currentModelPath,
        serializedAnnotations
      );
    } catch (error) {
      console.error("[AnnotationManager] 保存批注失败:", error);
    }
  }

  /**
   * 从本地存储加载批注
   */
  loadFromLocalStorage(): void {
    if (!this.currentModelId) {
      console.warn("[AnnotationManager] 无法加载批注：未设置当前模型信息");
      return;
    }

    if (!AnnotationStorageManager.isStorageAvailable()) {
      console.warn("[AnnotationManager] 本地存储不可用，无法加载批注");
      return;
    }

    try {
      const serializedAnnotations =
        AnnotationStorageManager.loadModelAnnotations(this.currentModelId);

      if (serializedAnnotations.length === 0) {
        console.log("[AnnotationManager] 未找到保存的批注数据");
        return;
      }

      // 清除当前批注（不触发自动保存）
      this.autoSaveEnabled = false;
      this.clearAllAnnotations();
      this.autoSaveEnabled = true;

      // 恢复批注
      let restoredCount = 0;
      for (const serialized of serializedAnnotations) {
        if (this.restoreAnnotation(serialized)) {
          restoredCount++;
        }
      }

      console.log(
        `[AnnotationManager] 成功恢复 ${restoredCount}/${serializedAnnotations.length} 个批注`
      );
    } catch (error) {
      console.error("[AnnotationManager] 加载批注失败:", error);
    }
  }

  /**
   * 恢复单个批注
   */
  private restoreAnnotation(serialized: SerializedAnnotationData): boolean {
    try {
      // 尝试通过UUID查找对象
      let targetObject: THREE.Object3D | null = null;

      if (serialized.objectUuid && this.viewer?.scene) {
        targetObject = this.findObjectByUuid(
          this.viewer.scene,
          serialized.objectUuid
        );
      }

      // 如果通过UUID找不到，尝试通过名称和类型查找
      if (!targetObject && serialized.objectData && this.viewer?.scene) {
        targetObject = this.findObjectByNameAndType(
          this.viewer.scene,
          serialized.objectData.name,
          serialized.objectData.type
        );
      }

      // 如果仍然找不到，使用场景根对象作为默认对象
      if (!targetObject && this.viewer?.scene) {
        console.warn(
          `[AnnotationManager] 未找到批注关联的对象，使用场景作为默认对象: ${serialized.id}`
        );
        targetObject = this.viewer.scene;
      }

      if (!targetObject) {
        console.error(
          `[AnnotationManager] 无法恢复批注，未找到关联对象: ${serialized.id}`
        );
        return false;
      }

      // 创建位置向量
      const position = new THREE.Vector3(
        serialized.position.x,
        serialized.position.y,
        serialized.position.z
      );

      // 创建批注数据
      const annotationData: AnnotationData = {
        id: serialized.id,
        config: serialized.config,
        position,
        object: targetObject,
      };

      this.annotations.set(serialized.id, annotationData);
      this.createLabel(annotationData);

      return true;
    } catch (error) {
      console.error(
        `[AnnotationManager] 恢复批注失败: ${serialized.id}`,
        error
      );
      return false;
    }
  }

  /**
   * 通过UUID查找对象
   */
  private findObjectByUuid(
    scene: THREE.Scene,
    uuid: string
  ): THREE.Object3D | null {
    return scene.getObjectByProperty("uuid", uuid) || null;
  }

  /**
   * 通过名称和类型查找对象
   */
  private findObjectByNameAndType(
    scene: THREE.Scene,
    name?: string,
    type?: string
  ): THREE.Object3D | null {
    if (!name && !type) return null;

    let foundObject: THREE.Object3D | null = null;

    scene.traverse((object) => {
      if (foundObject) return; // 已找到，跳过后续查找

      const nameMatch = !name || object.name === name;
      const typeMatch = !type || object.type === type;

      if (nameMatch && typeMatch) {
        foundObject = object;
      }
    });

    return foundObject;
  }

  /**
   * 设置自动保存开关
   */
  setAutoSaveEnabled(enabled: boolean): void {
    this.autoSaveEnabled = enabled;
    console.log(`[AnnotationManager] 自动保存已${enabled ? "启用" : "禁用"}`);
  }

  /**
   * 获取当前模型ID
   */
  getCurrentModelId(): string | undefined {
    return this.currentModelId;
  }

  /**
   * 获取当前模型路径
   */
  getCurrentModelPath(): string | undefined {
    return this.currentModelPath;
  }

  /**
   * 手动保存批注
   */
  manualSave(): void {
    this.saveToLocalStorage();
  }

  /**
   * 删除当前模型的本地存储批注
   */
  deleteLocalStorageAnnotations(): void {
    if (this.currentModelId) {
      AnnotationStorageManager.deleteModelAnnotations(this.currentModelId);
      console.log(
        `[AnnotationManager] 已删除模型 ${this.currentModelId} 的本地存储批注`
      );
    }
  }

  /**
   * 获取存储信息
   */
  getStorageInfo(): { count: number; sizeKB: number } {
    return AnnotationStorageManager.getStorageInfo();
  }
}
