/**
 * IFC代理对象调试工具类
 * 用于获取和分析IFC模型中的IfcBuildingElementProxy对象
 */
export class IfcProxyDebugger {
  private ifcLoader: any;
  private ifcManager: any;

  constructor(ifcLoader: any) {
    this.ifcLoader = ifcLoader;
    this.ifcManager = ifcLoader?.ifcManager;
  }

  /**
   * 检查IFC加载器是否可用
   */
  isAvailable(): boolean {
    return !!(this.ifcLoader && this.ifcManager);
  }

  /**
   * 获取所有IfcBuildingElementProxy对象的ID列表
   * @param modelID 模型ID
   * @returns 对象ID数组
   */
  getProxyIds(modelID: number = 0): number[] {
    if (!this.isAvailable()) {
      console.warn("IFC加载器未初始化");
      return [];
    }

    const IFCBUILDINGELEMENTPROXY = 1095909175;
    try {
      return (
        this.ifcManager.getAllItemsOfType(
          modelID,
          IFCBUILDINGELEMENTPROXY,
          false
        ) || []
      );
    } catch (error) {
      console.error("获取代理对象ID失败:", error);
      return [];
    }
  }

  /**
   * 获取单个代理对象的详细信息
   * @param modelID 模型ID
   * @param proxyId 代理对象ID
   * @returns 对象信息
   */
  getProxyInfo(modelID: number, proxyId: number): any {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const properties = this.ifcManager.getItemProperties(
        modelID,
        proxyId,
        true
      );
      const typeProperties = this.getTypeProperties(modelID, proxyId);
      const propertySets = this.getPropertySets(modelID, proxyId);
      const materialProperties = this.getMaterialProperties(modelID, proxyId);

      return {
        expressID: proxyId,
        modelID: modelID,
        properties: properties,
        typeProperties: typeProperties,
        propertySets: propertySets,
        materialProperties: materialProperties,
        summary: this.createSummary(properties),
      };
    } catch (error) {
      console.error(`获取代理对象 ${proxyId} 信息失败:`, error);
      return null;
    }
  }

  /**
   * 获取类型属性
   */
  private getTypeProperties(modelID: number, proxyId: number): any {
    try {
      return this.ifcManager.getTypeProperties(modelID, proxyId, true);
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取属性集
   */
  private getPropertySets(modelID: number, proxyId: number): any {
    try {
      return this.ifcManager.getPropertySets(modelID, proxyId, true);
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取材料属性
   */
  private getMaterialProperties(modelID: number, proxyId: number): any {
    try {
      return this.ifcManager.getMaterialsProperties(modelID, proxyId, true);
    } catch (error) {
      return null;
    }
  }

  /**
   * 创建对象摘要信息
   */
  private createSummary(properties: any): any {
    return {
      name: properties?.Name?.value || "未命名",
      description: properties?.Description?.value || "",
      globalId: properties?.GlobalId?.value || "",
      objectType: properties?.ObjectType?.value || "",
      tag: properties?.Tag?.value || "",
      predefinedType: properties?.PredefinedType?.value || "",
    };
  }

  /**
   * 分析所有代理对象并生成报告
   * @param modelID 模型ID
   * @returns 分析报告
   */
  generateReport(modelID: number = 0): any {
    const proxyIds = this.getProxyIds(modelID);
    const report = {
      modelID: modelID,
      totalCount: proxyIds.length,
      objects: [] as any[],
      summary: {
        byType: {} as any,
        byName: {} as any,
      },
    };

    proxyIds.forEach((proxyId: number) => {
      const info = this.getProxyInfo(modelID, proxyId);
      if (info) {
        report.objects.push(info);

        // 按类型统计
        const type = info.summary.objectType || "未知类型";
        report.summary.byType[type] = (report.summary.byType[type] || 0) + 1;

        // 按名称统计
        const name = info.summary.name || "未命名";
        report.summary.byName[name] = (report.summary.byName[name] || 0) + 1;
      }
    });

    return report;
  }

  /**
   * 导出报告到JSON文件
   * @param report 分析报告
   * @param filename 文件名
   */
  exportToJson(report: any, filename: string = "ifc_proxy_report.json"): void {
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(dataBlob);
    link.download = filename;
    link.click();

    URL.revokeObjectURL(link.href);
  }

  /**
   * 打印格式化的报告到控制台
   * @param modelID 模型ID
   */
  printFormattedReport(modelID: number = 0): void {
    const report = this.generateReport(modelID);

    console.log("=== IFC代理对象分析报告 ===");
    console.log(`模型ID: ${report.modelID}`);
    console.log(`总数量: ${report.totalCount}`);

    if (report.totalCount > 0) {
      console.log("\n=== 按类型统计 ===");
      Object.entries(report.summary.byType).forEach(([type, count]) => {
        console.log(`${type}: ${count}个`);
      });

      console.log("\n=== 按名称统计 ===");
      Object.entries(report.summary.byName).forEach(([name, count]) => {
        console.log(`${name}: ${count}个`);
      });

      console.log("\n=== 详细对象列表 ===");
      report.objects.forEach((obj: any, index: number) => {
        console.log(`\n--- 对象 ${index + 1} ---`);
        console.log(`ID: ${obj.expressID}`);
        console.log(`名称: ${obj.summary.name}`);
        console.log(`描述: ${obj.summary.description}`);
        console.log(`类型: ${obj.summary.objectType}`);
        console.log(`标签: ${obj.summary.tag}`);
        console.log(`预定义类型: ${obj.summary.predefinedType}`);
      });
    } else {
      console.log("未找到IfcBuildingElementProxy对象");
    }
  }
}
