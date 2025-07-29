import { Component, Vue, Prop } from "vue-property-decorator";
import { VNode } from "vue/types/umd";
import styles from "./AnnotationLabel.module.scss";
import { AnnotationConfig } from "./AnnotationConfigModal";

@Component
export default class AnnotationLabel extends Vue {
  @Prop({ required: true }) config!: AnnotationConfig;
  @Prop({ required: true }) position!: { x: number; y: number; z: number };
  @Prop({ default: false }) visible!: boolean;

  private getTypeIcon() {
    switch (this.config.type) {
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

  private getPriorityColor() {
    switch (this.config.priority) {
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

  protected render(): VNode {
    if (!this.visible) {
      return <div></div>;
    }

    return (
      <div
        class={styles.annotationLabel}
        style={{
          left: `${this.position.x}px`,
          top: `${this.position.y}px`
        }}
      >
        <div class={styles.labelHeader}>
          <span class={styles.typeIcon}>{this.getTypeIcon()}</span>
          <span class={styles.title}>{this.config.title}</span>
          <div
            class={styles.priorityBadge}
            style={{
              backgroundColor: this.getPriorityColor()
            }}
          >
            {this.config.priority}
          </div>
        </div>
        {this.config.description && (
          <div class={styles.description}>{this.config.description}</div>
        )}
        <div class={styles.arrow}></div>
      </div>
    );
  }
}
