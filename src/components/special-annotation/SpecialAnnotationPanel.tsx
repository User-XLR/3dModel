import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { VNode } from "vue/types/umd";
import styles from "./SpecialAnnotationPanel.module.scss";

export interface SpecialAnnotationInfo {
  tag: string;
  name: string;
  type: string;
  timestamp: string;
  uuid: string;
  properties?: any;
}

export interface SpecialAnnotationPanelProps {
  visible: boolean;
  annotationInfo?: SpecialAnnotationInfo;
}

@Component
export default class SpecialAnnotationPanel extends Vue {
  @Prop({ required: true }) visible!: SpecialAnnotationPanelProps["visible"];
  @Prop() annotationInfo?: SpecialAnnotationPanelProps["annotationInfo"];

  private specialAnnotations: SpecialAnnotationInfo[] = [];

  mounted() {
    // 监听特殊标注事件
    window.addEventListener(
      "specialAnnotation",
      this.handleSpecialAnnotation as EventListener
    );
  }

  beforeDestroy() {
    window.removeEventListener(
      "specialAnnotation",
      this.handleSpecialAnnotation as EventListener
    );
  }

  private handleSpecialAnnotation(event: Event) {
    const customEvent = event as CustomEvent;
    const { object, properties } = customEvent.detail;
    const annotationInfo: SpecialAnnotationInfo = {
      tag: properties.Tag,
      name: properties.Name || "未命名",
      type: properties.type || "未知类型",
      timestamp: new Date().toISOString(),
      uuid: object.uuid,
      properties: properties
    };

    this.specialAnnotations.push(annotationInfo);
    this.$forceUpdate();
  }

  private removeAnnotation(index: number) {
    this.specialAnnotations.splice(index, 1);
  }

  private clearAllAnnotations() {
    this.specialAnnotations = [];
  }

  protected render(): VNode {
    if (!this.visible || this.specialAnnotations.length === 0) {
      return <div></div>;
    }

    return (
      <div class={styles.specialAnnotationPanel}>
        <div class={styles.header}>
          <h3>🔴 特殊标注对象 (Tag: 975903)</h3>
          <el-button
            size="mini"
            type="danger"
            onClick={this.clearAllAnnotations}
          >
            清空所有
          </el-button>
        </div>

        <div class={styles.content}>
          {this.specialAnnotations.map((annotation, index) => (
            <div key={annotation.uuid} class={styles.annotationItem}>
              <div class={styles.annotationHeader}>
                <span class={styles.tag}>Tag: {annotation.tag}</span>
                <el-button
                  size="mini"
                  type="text"
                  onClick={() => this.removeAnnotation(index)}
                >
                  ✕
                </el-button>
              </div>

              <div class={styles.annotationDetails}>
                <div class={styles.detailRow}>
                  <span class={styles.label}>名称:</span>
                  <span class={styles.value}>{annotation.name}</span>
                </div>
                <div class={styles.detailRow}>
                  <span class={styles.label}>类型:</span>
                  <span class={styles.value}>{annotation.type}</span>
                </div>
                <div class={styles.detailRow}>
                  <span class={styles.label}>UUID:</span>
                  <span class={styles.value}>{annotation.uuid}</span>
                </div>
                <div class={styles.detailRow}>
                  <span class={styles.label}>时间:</span>
                  <span class={styles.value}>
                    {new Date(annotation.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              {annotation.properties && (
                <div class={styles.properties}>
                  <h4>属性详情:</h4>
                  <pre class={styles.propertiesJson}>
                    {JSON.stringify(annotation.properties, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
}
