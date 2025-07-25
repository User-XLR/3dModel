# IFC 代理对象调试功能使用示例

## 快速开始

### 1. 自动触发

当加载 IFC 模型时，系统会自动在模型加载完成后检测并打印所有 IfcBuildingElementProxy 对象信息。

### 2. 手动触发

在 BIM 查看器界面左上角有两个按钮：

- **打印 IFC 代理对象**: 直接打印所有代理对象的详细信息到控制台
- **分析 IFC 代理对象**: 生成格式化报告并导出 JSON 文件

## 控制台输出示例

### 基本输出

```
=== 检查模型 0 中的IfcBuildingElementProxy对象 ===
找到 5 个IfcBuildingElementProxy对象:

--- IfcBuildingElementProxy #1 (ID: 12345) ---
属性信息: {
  expressID: 12345,
  type: 1095909175,
  GlobalId: { value: "2O2Fr$t4X7Zf8NOew3FNrX" },
  Name: { value: "Wall-01" },
  Description: { value: "外墙" },
  ObjectType: { value: "WALL" },
  Tag: { value: "WALL-001" },
  PredefinedType: { value: "ELEMENT" }
}
```

### 格式化报告输出

```
=== IFC代理对象分析报告 ===
模型ID: 0
总数量: 5

=== 按类型统计 ===
WALL: 3个
DOOR: 1个
WINDOW: 1个

=== 按名称统计 ===
Wall-01: 1个
Wall-02: 1个
Wall-03: 1个
Door-01: 1个
Window-01: 1个

=== 详细对象列表 ===
--- 对象 1 ---
ID: 12345
名称: Wall-01
描述: 外墙
类型: WALL
标签: WALL-001
预定义类型: ELEMENT
```

## 编程调用示例

### 基本用法

```typescript
// 获取Viewer3D实例
const viewer = this.viewer

// 方法1: 打印所有代理对象信息
await viewer.printAllIfcBuildingElementProxies()

// 方法2: 获取数据数组
const proxyObjects = await viewer.getAllIfcBuildingElementProxies()

// 方法3: 使用调试工具生成报告
viewer.analyzeIfcBuildingElementProxies()
```

### 高级用法

```typescript
import { IfcProxyDebugger } from '@/utils/IfcProxyDebugger';

// 创建调试工具实例
const debugger = new IfcProxyDebugger(viewer.ifcLoader);

// 检查可用性
if (debugger.isAvailable()) {
  // 获取所有代理对象ID
  const proxyIds = debugger.getProxyIds(0);

  // 获取单个对象信息
  const proxyInfo = debugger.getProxyInfo(0, proxyIds[0]);

  // 生成完整报告
  const report = debugger.generateReport(0);

  // 导出到JSON文件
  debugger.exportToJson(report, 'my_report.json');

  // 打印格式化报告
  debugger.printFormattedReport(0);
}
```

## 数据结构说明

### 代理对象信息结构

```typescript
interface ProxyObjectInfo {
  expressID: number // Express ID
  modelID: number // 模型ID
  properties: any // 基本属性
  typeProperties: any // 类型属性
  propertySets: any // 属性集
  materialProperties: any // 材料属性
  summary: {
    name: string // 对象名称
    description: string // 描述
    globalId: string // 全局ID
    objectType: string // 对象类型
    tag: string // 标签
    predefinedType: string // 预定义类型
  }
}
```

### 报告结构

```typescript
interface AnalysisReport {
  modelID: number // 模型ID
  totalCount: number // 总数量
  objects: ProxyObjectInfo[] // 对象列表
  summary: {
    byType: { [key: string]: number } // 按类型统计
    byName: { [key: string]: number } // 按名称统计
  }
}
```

## 常见问题

### Q: 为什么没有找到 IfcBuildingElementProxy 对象？

A: 可能的原因：

1. 模型不是 IFC 格式
2. 模型中没有 IfcBuildingElementProxy 对象
3. IFC 加载器未正确初始化
4. 模型 ID 不正确

### Q: 如何获取正确的模型 ID？

A: 系统会自动从场景中查找 IFC 模型，也可以手动指定 modelID 参数。

### Q: 性能影响如何？

A: 对于大型模型，获取所有代理对象信息可能需要一些时间，建议在开发环境使用。

### Q: 如何过滤特定类型的对象？

A: 可以在获取数据后使用 JavaScript 的 filter 方法进行过滤：

```typescript
const wallProxies = proxyObjects.filter(obj => obj.summary.objectType === 'WALL')
```

## 扩展功能

### 自定义过滤

```typescript
// 按名称过滤
const filteredByName = proxyObjects.filter(obj => obj.summary.name.includes('Wall'))

// 按类型过滤
const filteredByType = proxyObjects.filter(obj => ['WALL', 'DOOR', 'WINDOW'].includes(obj.summary.objectType))

// 按描述过滤
const filteredByDescription = proxyObjects.filter(obj => obj.summary.description.includes('外墙'))
```

### 数据导出

```typescript
// 导出为CSV
function exportToCSV(proxyObjects: any[]) {
  const csvContent = proxyObjects
    .map(obj => `${obj.expressID},${obj.summary.name},${obj.summary.objectType}`)
    .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'proxy_objects.csv'
  link.click()
}
```

### 可视化显示

```typescript
// 在界面上显示代理对象列表
function displayProxyObjects(proxyObjects: any[]) {
  const container = document.getElementById('proxy-list')
  container.innerHTML = proxyObjects
    .map(
      obj => `
    <div class="proxy-item">
      <h4>${obj.summary.name}</h4>
      <p>类型: ${obj.summary.objectType}</p>
      <p>描述: ${obj.summary.description}</p>
      <p>ID: ${obj.expressID}</p>
    </div>
  `
    )
    .join('')
}
```
