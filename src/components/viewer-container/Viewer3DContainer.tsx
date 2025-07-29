import * as THREE from "three";
import { Component, Vue, Prop } from "vue-property-decorator";
import { cloneDeep } from "lodash";
import { Message } from "element-ui";
import { ProjectManager, Project, Model } from "@/core/ProjectManager";
import {
  Settings as SettingsType,
  defaultSettings,
  settingStoreKeyName,
} from "@/components/projectSettingsPanel/ProjectSettingsDef";
import { Types } from "@/store/index";
import { VNode } from "vue/types/umd";
import BimTree from "@/components/bim-tree/BimTree";
import BottomBar from "@/components/bottom-bar/BottomBar";
import CoordinateAxesViewport from "@/core/axes/CoordinateAxesViewport";
import MaterialManager from "@/components/materials/MaterialManager";
import ProgressBar from "@/components/progress-bar/ProgressBar";
import ProjectSettingsPanel from "@/components/projectSettingsPanel/ProjectSettingsPanel";
import PropertyPanel from "@/components/property/PropertyPanel";
import settingPanelStyle from "@/components/projectSettingsPanel/ProjectSettings.module.scss";
import SnapshotPanel from "../snapshot/SnapshotPanel";
import styles from "./Viewer3DContainer.module.scss";
import Viewer3D from "@/core/Viewer3D";
import AnnotationConfigModal, {
  AnnotationConfig,
} from "@/components/annotation/AnnotationConfigModal";

export interface Viewer3DContainerProps {
  projectId: string;
}

export enum EventStatus {
  FAILED = 0,
  RUNNING = 1,
  SUCCEEDED = 2,
}

@Component
export default class Viewer3DContainer extends Vue {
  @Prop({ required: true }) projectId!: Viewer3DContainerProps["projectId"];

  selectedObjId = "";
  viewer?: Viewer3D;
  axesViewport?: CoordinateAxesViewport;
  onLoading = false;
  loadingProgress = 0;
  loadingText = "";
  projectSettings?: SettingsType;
  showProjectSettingPanel = false;

  // 注释相关属性
  showAnnotationModal = false;
  annotationModalPosition = { x: 0, y: 0 };
  annotationConfig: AnnotationConfig = {
    title: "",
    description: "",
    type: "info",
    priority: 1,
    color: "#409EFF",
  };

  clickedObject?: THREE.Object3D;

  clickedPosition?: THREE.Vector3;

  mounted() {
    this.initProjectSettings();
    const viewerContainer = this.$refs.viewerContainer as HTMLDivElement;
    const viewer = new Viewer3D(
      window.innerWidth,
      window.innerHeight,
      this.projectSettings
    ); // full screen
    viewer.animate();
    this.viewer = viewer;
    if (viewer.renderer) {
      viewerContainer.appendChild(viewer.renderer.domElement);

      // 先尝试从示例项目中查找
      ProjectManager.getSampleProjects().then((projects) => {
        const proj = projects.find((p: Project) => p.id === this.projectId);
        if (proj) {
          this.$store.commit(Types.MUTATION_ACTIVE_PROJECT, proj);
          this.loadSampleProjectModels(viewer, proj);
        } else {
          // 如果示例项目中没找到，尝试从用户项目中查找
          this.loadCustomProject(viewer);
        }
      });
    }
    if (viewer.css2dRenderer) {
      viewer.css2dRenderer.domElement.classList.add("css2dRenderer");
      viewerContainer.appendChild(viewer.css2dRenderer.domElement);
    }
    this.initStats(viewer);
    this.initAxesRenderer(viewer);

    // handle window resize event
    window.addEventListener(
      "resize",
      () => {
        viewer && viewer.resize(window.innerWidth, window.innerHeight);
      },
      false
    );

    viewer.watch("selectedObject", (obj: any) => {
      if (obj?.userData?.gltfExtensions) {
        const extensions = obj?.userData?.gltfExtensions;
        const objId =
          extensions?.objectId?.Value || extensions?.elementId?.Value;
        this.selectedObjId = objId || "";
      } else if (obj?.uuid) {
        this.selectedObjId = obj.uuid;
      } else {
        this.selectedObjId = "";
      }
    });

    // 初始化注释功能
    this.initAnnotationFeature(viewer, viewerContainer);
  }

  async loadCustomProject(viewer: Viewer3D) {
    try {
      const customProjects = await ProjectManager.getCustomProjects();
      const proj = customProjects.find((p: Project) => p.id === this.projectId);
      if (proj) {
        this.$store.commit(Types.MUTATION_ACTIVE_PROJECT, proj);
        this.loadCustomProjectModels(viewer, proj);
      } else {
        Message.error(
          `Failed to find project for projectId: ${this.projectId}`
        );
      }
    } catch (error: any) {
      const errorMessage = error && error.message ? error.message : "未知错误";
      Message.error(`Failed to load project: ${errorMessage}`);
    }
  }

  loadCustomProjectModels(viewer: Viewer3D, proj: Project) {
    if (!viewer || !proj) {
      console.log("[VC] Failed to load a project!");
      return;
    }
    if (!proj.models || proj.models.length < 1) {
      console.log("[VC] No models to load!");
      Message.warning("该项目暂无模型文件");
      return;
    }
    this.onLoading = false;
    this.loadingProgress = 0;
    let counter = 0; // to indicate how many models are loading
    for (let i = 0; i < proj.models.length; ++i) {
      const model = proj.models[i];
      if (model.visible === false) {
        continue; // skip when visible is false
      }
      counter++;
      this.onLoading = true;
      viewer
        .loadModel(
          model,
          (event) => {
            this.loadingText = `${proj.name}(${i + 1}/${proj.models.length})`;
            this.loadingProgress = Math.floor(
              (event.loaded * 100) / event.total
            );
          },
          (event) => {
            const errorMessage =
              event && event.message ? event.message : "未知错误";
            Message.error("Failed to load " + model.src + ". " + errorMessage);
            this.onLoading = --counter > 0;
          }
        )
        .then(() => {
          this.onLoading = --counter > 0;
        });
    }
  }

  initStats(viewer: Viewer3D) {
    const stats = viewer.stats as any;
    if (stats) {
      stats.setMode(0); // 0: fps, 1: ms
      const statsOutput = this.$refs.statsOutput as HTMLDivElement;
      statsOutput.appendChild(stats.domElement);
    }
  }

  initProjectSettings() {
    const key = settingStoreKeyName + "_" + this.projectId;
    const savedSettings: SettingsType =
      localStorage.getItem(key) && JSON.parse(localStorage.getItem(key) || "");
    const result = cloneDeep(defaultSettings);
    if (savedSettings) {
      Object.assign(result, cloneDeep(savedSettings));
    }
    this.projectSettings = result;
  }

  beforeDestroy() {
    if (this.viewer) {
      this.viewer.beforeDestroy();
      this.viewer = undefined;
    }
    if (this.axesViewport) {
      this.axesViewport.dispose();
      this.axesViewport = undefined;
    }
    this.selectedObjId = "";
    this.loadingText = "";
  }

  initAxesRenderer(viewer: Viewer3D) {
    const axesDiv = this.$refs.axesRenderer as HTMLDivElement;
    const cav = new CoordinateAxesViewport(
      axesDiv.clientWidth,
      axesDiv.clientHeight
    );
    if (cav.renderer) {
      axesDiv.appendChild(cav.renderer.domElement);
      cav.setHostRenderer(viewer);
    }
    this.axesViewport = cav;
  }

  loadSampleProjectModels(viewer: Viewer3D, proj: Project) {
    if (!viewer || !proj) {
      console.log("[VC] Failed to load a project!");
      return;
    }
    if (!proj.models || proj.models.length < 1) {
      console.log("[VC] No models to load!");
      return;
    }
    this.onLoading = false;
    this.loadingProgress = 0;
    let counter = 0; // to indicate how many models are loading
    for (let i = 0; i < proj.models.length; ++i) {
      const model = proj.models[i];
      if (model.visible === false) {
        continue; // skip when visible is false
      }
      counter++;
      this.onLoading = true;
      viewer
        .loadModel(
          model,
          (event) => {
            this.loadingText = `${proj.name}(${i + 1}/${proj.models.length})`;
            this.loadingProgress = Math.floor(
              (event.loaded * 100) / event.total
            );
          },
          (event) => {
            const errorMessage =
              event && event.message ? event.message : "未知错误";
            Message.error("Failed to load " + model.src + ". " + errorMessage);
            this.onLoading = --counter > 0;
          }
        )
        .then(() => {
          this.onLoading = --counter > 0;
        });
    }
  }

  getEventStatusIcon(status: number) {
    let icon = "";
    switch (status) {
      case EventStatus.RUNNING:
        icon = "el-icon-loading";
        break;
      case EventStatus.FAILED:
        icon = "el-icon-warning";
        break;
      case EventStatus.SUCCEEDED:
        icon = "el-icon-success";
        break;
      default:
        icon = "el-icon-loading";
        break;
    }
    return icon;
  }

  toggleProjectSettingPanel(val: boolean) {
    this.$store.commit(Types.MUTATION_SHOW_PROJECT_SETTINGS_PANEL, val);
  }

  /**
   * 初始化注释功能
   */
  initAnnotationFeature(viewer: Viewer3D, container: HTMLElement) {
    // 初始化注释管理器
    viewer.initAnnotationManager(container);

    // 设置注释回调
    viewer.setAnnotationCallback(
      (object: THREE.Object3D, position: THREE.Vector3, event: MouseEvent) => {
        this.clickedObject = object;
        this.clickedPosition = position;
        this.annotationModalPosition = { x: event.clientX, y: event.clientY };
        this.showAnnotationModal = true;
      }
    );
  }

  /**
   * 处理注释配置确认
   */
  handleAnnotationConfirm(config: AnnotationConfig) {
    if (this.viewer && this.clickedObject && this.clickedPosition) {
      this.viewer.createAnnotation(
        this.clickedObject,
        this.clickedPosition,
        config
      );
    }
    this.showAnnotationModal = false;
  }

  /**
   * 处理注释配置取消
   */
  handleAnnotationCancel() {
    this.showAnnotationModal = false;
  }

  /**
   * Enables user to upload a model file from local disk.
   * TODO:
   * - Enable user to set the model's position, rotation, scale, etc.
   * - Enable to store the model to server, so user can see it next time open the same project.
   */
  uploadModelFile(viewer?: Viewer3D) {
    return (event: any) => {
      const files = event.target.files;
      if (!files || files.length <= 0) {
        return;
      }
      const file = files[0];
      // 为用户上传的文件创建Blob URL，这样Three.js加载器才能正确加载
      const url = URL.createObjectURL(file);
      this.onLoading = true;

      // 从文件名提取文件类型
      const fileName = file.name.toLowerCase();
      let fileType = "gltf"; // 默认
      if (fileName.endsWith(".ifc")) {
        fileType = "ifc";
      } else if (fileName.endsWith(".fbx")) {
        fileType = "fbx";
      } else if (fileName.endsWith(".obj")) {
        fileType = "obj";
      } else if (fileName.endsWith(".dae")) {
        fileType = "dae";
      } else if (fileName.endsWith(".stl")) {
        fileType = "stl";
      } else if (fileName.endsWith(".gltf") || fileName.endsWith(".glb")) {
        fileType = "gltf";
      }

      const options: Model = {
        src: url, // 使用Blob URL而不是文件名
        fileType: fileType, // 指定文件类型
        originalFileName: file.name, // 保存原始文件名
        name: file.name,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        instantiate: false,
        merge: false,
      };

      console.log(
        `[UploadModel] File: ${file.name}, Type: ${fileType}, URL: ${url}`
      );

      viewer &&
        viewer
          .loadLocalModel(
            options,
            (event) => {
              this.loadingText = `Loading ${file.name}`;
              this.loadingProgress = Math.floor(
                (event.loaded * 100) / event.total
              );
            },
            (event) => {
              const errorMessage =
                event && event.message ? event.message : "未知错误";
              Message.error(
                "Failed to load " + file.name + ". " + errorMessage
              );
              this.onLoading = false;
              // 加载失败时释放Blob URL内存
              URL.revokeObjectURL(url);
            }
          )
          .then(() => {
            this.onLoading = false;
            // 加载成功后也可以释放Blob URL内存（可选，根据需要保留）
            // URL.revokeObjectURL(url);
          });
    };
  }

  protected render(): VNode {
    return (
      <div ref="viewerContainer" class={styles.viewerContainer}>
        <div ref="statsOutput" class={styles.statsOutput} />
        <BimTree viewer={this.viewer} />
        <PropertyPanel
          scene={this.viewer?.scene}
          objId={this.selectedObjId}
          class={styles.propertyPanel}
        />
        <MaterialManager viewer={this.viewer} />
        <div ref="axesRenderer" id="axesRenderer" class={styles.axesRenderer} />
        <SnapshotPanel canvas={this.viewer?.renderer?.domElement} />
        <BottomBar viewer={this.viewer} />
        {/* Used to enable user from uploading a local model file to scene. The model won't be saved to server for now */}
        <input
          type="file"
          id="uploadModelFile"
          style="display: none"
          onChange={this.uploadModelFile(this.viewer)}
        />
        {this.onLoading && (
          <ProgressBar
            text={this.loadingText}
            progressValue={this.loadingProgress}
          />
        )}
        <el-dialog
          title="Project settings"
          width="400px"
          class={settingPanelStyle.pSettingDialog}
          visible={
            this.$store.getters[Types.GETTER_SHOW_PROJECT_SETTINGS_PANEL]
          }
          destroyOnClose={true}
          on={{
            "update:visible": (val: boolean) => {
              this.toggleProjectSettingPanel(val);
            },
          }}
        >
          <ProjectSettingsPanel
            projectId={this.projectId}
            on={{
              "update:visible": (val: boolean) => {
                this.toggleProjectSettingPanel(val);
              },
            }}
            viewer={this.viewer}
          ></ProjectSettingsPanel>
        </el-dialog>

        {/* 注释配置弹框 */}
        <AnnotationConfigModal
          visible={this.showAnnotationModal}
          position={this.annotationModalPosition}
          config={this.annotationConfig}
          on={{
            confirm: this.handleAnnotationConfirm,
            cancel: this.handleAnnotationCancel,
          }}
        />
      </div>
    );
  }
}
