/**
 * FileTypeUtils - 文件类型检测工具类
 */
export default class FileTypeUtils {
  /**
   * 从文件名获取文件类型
   * @param fileName 文件名
   * @returns 文件类型字符串
   */
  public static getFileTypeFromFileName(fileName: string): string {
    const lowerFileName = fileName.toLowerCase();

    if (lowerFileName.endsWith(".ifc")) {
      return "ifc";
    } else if (lowerFileName.endsWith(".fbx")) {
      return "fbx";
    } else if (lowerFileName.endsWith(".obj")) {
      return "obj";
    } else if (lowerFileName.endsWith(".dae")) {
      return "dae";
    } else if (lowerFileName.endsWith(".stl")) {
      return "stl";
    } else if (lowerFileName.endsWith(".shp")) {
      return "shp";
    } else if (
      lowerFileName.endsWith(".gltf") ||
      lowerFileName.endsWith(".glb")
    ) {
      return "gltf";
    } else {
      return "gltf"; // 默认类型
    }
  }

  /**
   * 检查文件类型是否支持
   * @param fileType 文件类型
   * @returns 是否支持
   */
  public static isSupportedFileType(fileType: string): boolean {
    const supportedTypes = [
      "ifc",
      "fbx",
      "obj",
      "dae",
      "stl",
      "shp",
      "gltf",
      "glb",
    ];
    return supportedTypes.includes(fileType.toLowerCase());
  }

  /**
   * 获取文件类型的描述
   * @param fileType 文件类型
   * @returns 文件类型描述
   */
  public static getFileTypeDescription(fileType: string): string {
    const descriptions: { [key: string]: string } = {
      ifc: "Industry Foundation Classes (建筑信息模型)",
      fbx: "Autodesk FBX (3D模型交换格式)",
      obj: "Wavefront OBJ (3D几何定义格式)",
      dae: "COLLADA Digital Asset Exchange (数字资产交换)",
      stl: "STereoLithography (立体光刻格式)",
      shp: "Shapefile (GIS矢量数据)",
      gltf: "GL Transmission Format (WebGL传输格式)",
      glb: "GL Transmission Format Binary (WebGL传输格式二进制)",
    };

    return descriptions[fileType.toLowerCase()] || "未知格式";
  }
}
