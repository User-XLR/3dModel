import { Component, Prop, Vue, Emit } from "vue-property-decorator";
import { Form, Upload } from "element-ui";
import { VNode } from "vue/types/umd";
import styles from "./UploadForm.module.scss";

export interface UploadFormProps {
  projectId: string;
}

@Component
export default class UploadForm extends Vue {
  @Prop({ default: "" }) projectId!: UploadFormProps["projectId"];

  @Emit()
  submit(data: {}) {}

  @Emit()
  cancel() {}

  uploadFiles: File[] = [];
  uploadFormData = {
    projectName: "",
    projectDescription: "",
  };

  uploading = false;

  get uploadTip() {
    return "支持的文件格式：.gltf, .glb, .fbx, .dae, .obj, .ifc";
  }

  mounted() {}

  reset() {
    const upload = this.$refs.upload as Upload;
    const form = this.$refs.form as Form;
    if (form) {
      form.resetFields();
    }
    if (upload) {
      upload.clearFiles();
    }
    this.uploadFiles = [];
    this.uploading = false;
  }

  async submitUpload() {
    if (!this.uploadFormData.projectName.trim()) {
      if (this.$message && this.$message.error) {
        this.$message.error("请输入项目名称");
      }
      return;
    }

    // 移除强制文件选择的验证，允许创建空项目
    // if (this.uploadFiles.length === 0) {
    //   if (this.$message && this.$message.error) {
    //     this.$message.error("请选择要上传的文件");
    //   }
    //   return;
    // }

    this.uploading = true;
    try {
      const upload = this.$refs.upload as Upload;
      upload && upload.submit();
      this.submit({ ...this.uploadFormData, uploadFiles: this.uploadFiles });
      this.reset();
    } catch (error: any) {
      const errorMessage = error && error.message ? error.message : "未知错误";
      if (this.$message && this.$message.error) {
        this.$message.error("上传失败：" + errorMessage);
      }
    } finally {
      this.uploading = false;
    }
  }

  cancelUpload() {
    this.reset();
    this.cancel();
  }

  httpRequest(param: { file: any }) {
    this.uploadFiles.push(param.file);
  }

  protected render(): VNode {
    return (
      <el-form
        class={styles.uploadForm}
        ref="form"
        label-width="120px"
        size="mini"
        {...{
          props: {
            model: this.uploadFormData,
          },
        }}
      >
        {!this.projectId && (
          <div>
            <el-form-item label="项目名称" prop="projectName" required>
              <el-input
                v-model={this.uploadFormData.projectName}
                placeholder="请输入项目名称"
              ></el-input>
            </el-form-item>
            <el-form-item label="项目描述" prop="projectDescription">
              <el-input
                v-model={this.uploadFormData.projectDescription}
                type="textarea"
                placeholder="请输入项目描述（可选）"
              ></el-input>
            </el-form-item>
            <el-form-item label="模型文件">
              <el-upload
                ref="upload"
                action=""
                multiple
                class={styles.fileUpload}
                http-request={this.httpRequest}
                file-list={this.uploadFiles}
                auto-upload={false}
                accept=".gltf,.glb,.fbx,.dae,.obj,.ifc"
              >
                <el-button slot="trigger" size="mini" type="primary">
                  选择文件
                </el-button>
                <div slot="tip">{this.uploadTip}（可选，也可以稍后上传）</div>
              </el-upload>
            </el-form-item>
            <el-form-item>
              <el-button
                size="mini"
                type="primary"
                onClick={this.submitUpload}
                loading={this.uploading}
                disabled={this.uploading}
              >
                {this.uploading ? "创建中..." : "创建项目"}
              </el-button>
              <el-button
                size="mini"
                onClick={this.cancelUpload}
                disabled={this.uploading}
              >
                取消
              </el-button>
            </el-form-item>
          </div>
        )}
        {this.projectId && (
          <div>
            <el-upload
              ref="upload"
              action=""
              multiple
              class={styles.fileUpload}
              http-request={this.httpRequest}
              file-list={this.uploadFiles}
              auto-upload={false}
              accept=".gltf,.glb,.fbx,.dae,.obj,.ifc"
            >
              <el-button slot="trigger" size="mini" type="primary">
                选择文件
              </el-button>
              <el-button
                size="mini"
                type="success"
                onClick={this.submitUpload}
                loading={this.uploading}
                disabled={this.uploading}
              >
                {this.uploading ? "上传中..." : "上传到服务器"}
              </el-button>
              <div slot="tip">{this.uploadTip}</div>
            </el-upload>
          </div>
        )}
      </el-form>
    );
  }
}
