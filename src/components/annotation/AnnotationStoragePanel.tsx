import { Component, Vue } from "vue-property-decorator";
import { VNode } from "vue/types/umd";
import AnnotationStorageManager, {
  ModelAnnotations,
} from "@/core/annotation/AnnotationStorageManager";
import styles from "./AnnotationStoragePanel.module.scss";

@Component
export default class AnnotationStoragePanel extends Vue {
  private modelAnnotations: ModelAnnotations[] = [];
  private storageInfo = { count: 0, sizeKB: 0 };
  private showPanel = false;

  mounted() {
    this.loadAnnotationsList();
  }

  /**
   * 加载批注列表
   */
  private loadAnnotationsList() {
    this.modelAnnotations = AnnotationStorageManager.getAllModelAnnotations();
    this.storageInfo = AnnotationStorageManager.getStorageInfo();
  }

  /**
   * 删除指定模型的批注
   */
  private deleteModelAnnotations(modelId: string) {
    if (confirm("确定要删除该模型的所有批注吗？")) {
      AnnotationStorageManager.deleteModelAnnotations(modelId);
      this.loadAnnotationsList();
      if (this.$message && this.$message.success) {
        this.$message.success("批注已删除");
      }
    }
  }

  /**
   * 清空所有批注
   */
  private clearAllAnnotations() {
    if (confirm("确定要清空所有模型的批注吗？此操作不可恢复！")) {
      AnnotationStorageManager.clearAllAnnotations();
      this.loadAnnotationsList();
      if (this.$message && this.$message.success) {
        this.$message.success("所有批注已清空");
      }
    }
  }

  /**
   * 格式化时间
   */
  private formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString("zh-CN");
  }

  /**
   * 格式化文件路径
   */
  private formatPath(path: string): string {
    const parts = path.split("/");
    return parts[parts.length - 1] || path;
  }

  /**
   * 切换面板显示
   */
  private togglePanel() {
    this.showPanel = !this.showPanel;
    if (this.showPanel) {
      this.loadAnnotationsList();
    }
  }

  protected render(): VNode {
    return (
      <div class={styles.annotationStoragePanel}>
        {/* 切换按钮 */}
        <button
          class={styles.toggleButton}
          onClick={this.togglePanel}
          title="批注存储管理"
        >
          📋 批注存储 ({this.storageInfo.count})
        </button>

        {/* 面板内容 */}
        {this.showPanel && (
          <div class={styles.panel}>
            <div class={styles.header}>
              <h3>批注存储管理</h3>
              <button class={styles.closeBtn} onClick={this.togglePanel}>
                ×
              </button>
            </div>

            <div class={styles.content}>
              {/* 存储信息 */}
              <div class={styles.storageInfo}>
                <p>已保存模型: {this.storageInfo.count} 个</p>
                <p>存储大小: {this.storageInfo.sizeKB} KB</p>
              </div>

              {/* 操作按钮 */}
              <div class={styles.actions}>
                <button
                  class={styles.refreshBtn}
                  onClick={this.loadAnnotationsList}
                >
                  🔄 刷新列表
                </button>
                <button
                  class={styles.clearBtn}
                  onClick={this.clearAllAnnotations}
                  disabled={this.modelAnnotations.length === 0}
                >
                  🗑️ 清空所有
                </button>
              </div>

              {/* 模型列表 */}
              <div class={styles.modelList}>
                {this.modelAnnotations.length === 0 ? (
                  <div class={styles.emptyState}>
                    <p>暂无保存的批注</p>
                    <p class={styles.hint}>
                      在模型上创建批注后，会自动保存到本地存储
                    </p>
                  </div>
                ) : (
                  this.modelAnnotations.map((model) => (
                    <div key={model.modelId} class={styles.modelItem}>
                      <div class={styles.modelInfo}>
                        <div class={styles.modelName}>
                          {this.formatPath(model.modelPath)}
                        </div>
                        <div class={styles.modelDetails}>
                          <span class={styles.annotationCount}>
                            {model.annotations.length} 个批注
                          </span>
                          <span class={styles.timestamp}>
                            {this.formatTime(model.timestamp)}
                          </span>
                        </div>
                        <div class={styles.modelPath} title={model.modelPath}>
                          {model.modelPath}
                        </div>
                      </div>
                      <div class={styles.modelActions}>
                        <button
                          class={styles.deleteBtn}
                          onClick={() =>
                            this.deleteModelAnnotations(model.modelId)
                          }
                          title="删除该模型的批注"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 使用说明 */}
              <div class={styles.usage}>
                <h4>使用说明：</h4>
                <ul>
                  <li>在模型上创建的批注会自动保存到浏览器本地存储</li>
                  <li>下次打开相同模型时，批注会自动恢复显示</li>
                  <li>每个模型的批注独立存储，互不影响</li>
                  <li>可以通过此面板管理和删除保存的批注</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}
