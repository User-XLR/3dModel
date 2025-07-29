// import { AxiosRequestConfig } from "axios";
// import { post } from "./base";

// 模拟数据存储
const projects: any[] = [];
let projectCounter = 1;

export async function getProjects() {
  // 模拟从服务器获取项目列表
  return projects;
}

export async function deleteProject(projectId: string) {
  // 模拟删除项目
  const index = projects.findIndex((p) => p._id === projectId);
  if (index > -1) {
    projects.splice(index, 1);
    return { success: true };
  }
  throw new Error("项目不存在");
}

export async function createProject(
  projectName: string,
  projectDescription = ""
) {
  // 模拟创建项目
  const newProject = {
    _id: `project_${projectCounter++}`,
    name: projectName,
    description: projectDescription,
    createdAt: new Date().toISOString(),
    models: [],
  };

  projects.push(newProject);

  return {
    projectId: newProject._id,
    success: true,
  };
}

export async function uploadBimFile(projectId: string, formData: FormData) {
  // 模拟文件上传
  const project = projects.find((p) => p._id === projectId);
  if (!project) {
    throw new Error("项目不存在");
  }

  // 模拟处理上传的文件
  const files = formData.getAll("file") as File[];
  const splitMethod = formData.get("splitMethod") || "default";

  // 为前端演示应用处理文件：创建Blob URL并存储
  for (const file of files) {
    // 为用户上传的文件创建Blob URL，这样可以在3D查看器中正确加载
    const blobUrl = URL.createObjectURL(file);

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

    const modelInfo = {
      name: file.name,
      src: blobUrl, // 使用Blob URL而不是假的路径
      fileType: fileType, // 保存文件类型信息
      originalFileName: file.name, // 保存原始文件名
      uploadedAt: new Date().toISOString(),
      size: file.size,
      type: file.type,
      // 存储原始文件信息用于后续处理
      _fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        fileType: fileType,
      },
    };

    project.models.push(modelInfo);
    console.log(
      `[ProjectService] Added model: ${file.name}, Type: ${fileType}`
    );
  }

  return {
    success: true,
    uploadedFiles: files.length,
  };
}

/**
 * Gets BIM models' sences belong to a project
 * @param projectId
 */
export async function getScenes(projectId: string) {
  const project = projects.find((p) => p._id === projectId);
  if (!project) {
    throw new Error("项目不存在");
  }

  return project.models || [];
}
