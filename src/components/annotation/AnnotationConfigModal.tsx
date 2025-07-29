import { Component, Vue, Prop, Emit } from "vue-property-decorator";
import { VNode } from "vue/types/umd";
import styles from "./AnnotationConfigModal.module.scss";

export interface AnnotationConfig {
  title: string;
  description: string;
  type: string;
  priority: number;
  color: string;
}

@Component
export default class AnnotationConfigModal extends Vue {
  @Prop({ required: true }) visible!: boolean;
  @Prop({ required: true }) position!: { x: number; y: number };
  @Prop({
    default: () => ({
      title: "",
      description: "",
      type: "info",
      priority: 1,
      color: "#409EFF"
    })
  })
    config!: AnnotationConfig;

  private formData: AnnotationConfig = {
    title: "",
    description: "",
    type: "info",
    priority: 1,
    color: "#409EFF"
  };

  private typeOptions = [
    { label: "信息", value: "info" },
    { label: "警告", value: "warning" },
    { label: "错误", value: "error" },
    { label: "成功", value: "success" }
  ];

  private priorityOptions = [
    { label: "低", value: 1 },
    { label: "中", value: 2 },
    { label: "高", value: 3 },
    { label: "紧急", value: 4 }
  ];

  mounted() {
    this.formData = { ...this.config };
  }

  @Emit()
  private confirm(config: AnnotationConfig) {}

  @Emit()
  private cancel() {}

  private handleConfirm() {
    if (!this.formData.title.trim()) {
      if (this.$message && this.$message.warning) {
        this.$message.warning("请输入标题");
      }
      return;
    }
    this.confirm(this.formData);
  }

  private handleCancel() {
    this.cancel();
  }

  protected render(): VNode {
    if (!this.visible) {
      return <div></div>;
    }

    return (
      <div class={styles.modalOverlay} onClick={this.handleCancel}>
        <div class={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div class={styles.modalHeader}>
            <h3>配置指示牌信息</h3>
            <button class={styles.closeBtn} onClick={this.handleCancel}>
              ×
            </button>
          </div>
          <div class={styles.modalBody}>
            <div class={styles.formItem}>
              <label>标题 *</label>
              <input
                type="text"
                v-model={this.formData.title}
                placeholder="请输入指示牌标题"
                class={styles.input}
              />
            </div>
            <div class={styles.formItem}>
              <label>描述</label>
              <textarea
                v-model={this.formData.description}
                placeholder="请输入指示牌描述"
                class={styles.textarea}
                rows={3}
              />
            </div>
            <div class={styles.formRow}>
              <div class={styles.formItem}>
                <label>类型</label>
                <select v-model={this.formData.type} class={styles.select}>
                  {this.typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div class={styles.formItem}>
                <label>优先级</label>
                <select v-model={this.formData.priority} class={styles.select}>
                  {this.priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div class={styles.formItem}>
              <label>颜色</label>
              <input
                type="color"
                v-model={this.formData.color}
                class={styles.colorInput}
              />
            </div>
          </div>
          <div class={styles.modalFooter}>
            <button class={styles.cancelBtn} onClick={this.handleCancel}>
              取消
            </button>
            <button class={styles.confirmBtn} onClick={this.handleConfirm}>
              确认
            </button>
          </div>
        </div>
      </div>
    );
  }
}
