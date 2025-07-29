import * as THREE from "three";
import { AnnotationConfig } from "@/components/annotation/AnnotationConfigModal";

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
      object
    };

    this.annotations.set(id, annotationData);
    this.createLabel(annotationData);

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
}
