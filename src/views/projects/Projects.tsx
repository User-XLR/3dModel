import { Component, Vue } from "vue-property-decorator";
import {
  createProject,
  deleteProject,
  uploadBimFile,
  getProjects,
} from "@/service/project";
import { Message } from "element-ui";
import { ProjectManager, Project } from "@/core/ProjectManager";
import { VNode } from "vue/types/umd";
import ProjectCard from "../../components/projects/ProjectCard";
import UploadForm from "@/components/upload-form/UploadForm";
import styles from "./Projects.module.scss";

@Component
export default class Projects extends Vue {
  // define a global static variable, so we only need to get demo projects once
  static sampleProjects: Project[] = [];
  sampleProjects: Project[] = [];
  onLoading = false;
  activateUpdate = false;
  customProjects: Project[] = [];
  showUploadForm = false;

  async mounted() {
    if (Projects.sampleProjects.length === 0) {
      this.onLoading = true;
      ProjectManager.getSampleProjects()
        .then((projects: Project[]) => {
          Projects.sampleProjects.push(...projects);
          this.sampleProjects = Projects.sampleProjects;
        })
        .finally(() => {
          this.onLoading = false;
        });
    } else {
      this.sampleProjects = Projects.sampleProjects;
    }

    // 加载用户项目
    await this.loadCustomProjects();
  }

  async loadCustomProjects() {
    try {
      const projects = await ProjectManager.getCustomProjects(true);
      this.customProjects = projects;
    } catch (error: any) {
      console.error("Failed to load custom projects:", error);
    }
  }

  createNewProject() {
    this.showUploadForm = true;
  }

  async addNewProject(data: any) {
    try {
      const projectId = await this.addProject(data);
      if (projectId && data.uploadFiles && data.uploadFiles.length) {
        await this.uploadModel(projectId, data);
      }
      this.showUploadForm = false;
      await this.loadCustomProjects(); // 重新加载项目列表
      Message.success("项目创建成功！");
    } catch (error: any) {
      const errorMessage = error && error.message ? error.message : "未知错误";
      Message.error("项目创建失败：" + errorMessage);
    }
  }

  async addProject(data: any) {
    const createData = new FormData();
    const projectKeys = ["projectName", "projectDescription"];
    projectKeys.forEach((key) => {
      if (data[key] !== undefined) {
        createData.append(key, data[key]);
      }
    });
    const res = (await createProject(
      data.projectName,
      data.projectDescription
    )) as any;
    if (res && res.projectId) {
      const proj = {
        id: res.projectId,
        name: data.projectName,
        models: [],
      };
      ProjectManager.addCustomProject(proj);
      this.customProjects = ProjectManager.customProjects;
      return res.projectId;
    }
    return "";
  }

  async uploadModel(projectId: string, data: any) {
    const upData = new FormData();
    if (data.uploadFiles && Array.isArray(data.uploadFiles)) {
      data.uploadFiles.forEach((file: File) => {
        if (file && file.name) {
          upData.append("file", file, file.name);
        }
      });
    }
    upData.append("splitMethod", data.splitMethod || "default");
    await uploadBimFile(projectId, upData);
  }

  async deleteProject(proj: Project) {
    try {
      proj.id && (await deleteProject(proj.id));
      proj.id && ProjectManager.deleteCustomProject(proj.id);
      this.customProjects = ProjectManager.customProjects;
      Message.success("项目删除成功！");
    } catch (error: any) {
      const errorMessage = error && error.message ? error.message : "未知错误";
      Message.error("项目删除失败：" + errorMessage);
    }
  }

  closeUploadForm() {
    this.showUploadForm = false;
  }

  protected render(): VNode {
    const sampleProjectCards = this.sampleProjects.map((p) => (
      <ProjectCard project={p} class={styles.card} key={p.id}></ProjectCard>
    ));

    const customProjectCards = this.customProjects.map((p) => (
      <ProjectCard
        project={p}
        class={styles.card}
        key={p.id}
        onDelete={() => this.deleteProject(p)}
      ></ProjectCard>
    ));

    return (
      <div ref="projects" class={styles.projects}>
        {/* 示例项目 */}
        <el-card class={styles.cardsWrapper}>
          <div slot="header">
            <span class="span">示例项目</span>
          </div>
          {sampleProjectCards}
        </el-card>

        {/* 用户项目 */}
        <el-card class={styles.cardsWrapper}>
          <div slot="header">
            <span class="span">我的项目</span>
            <el-button
              type="primary"
              size="small"
              style="float: right;"
              onClick={this.createNewProject}
            >
              上传新项目
            </el-button>
          </div>
          {customProjectCards.length > 0 ? (
            customProjectCards
          ) : (
            <div style="text-align: center; padding: 40px; color: #999;">
              暂无项目，点击"上传新项目"开始创建
            </div>
          )}
        </el-card>

        {/* 上传表单弹窗 */}
        {this.showUploadForm && (
          <el-dialog
            title="创建新项目"
            visible={this.showUploadForm}
            onClose={this.closeUploadForm}
            width="500px"
          >
            <UploadForm
              onSubmit={this.addNewProject}
              onCancel={this.closeUploadForm}
            />
          </el-dialog>
        )}
      </div>
    );
  }
}
