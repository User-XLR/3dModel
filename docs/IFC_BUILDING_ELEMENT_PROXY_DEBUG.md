# IFC BuildingElementProxy 调试功能

## 功能概述

本功能用于在 BIM 模型渲染时获取并打印每个结构对象的 IfcBuildingElementProxy 信息。IfcBuildingElementProxy 是 IFC 标准中用于表示建筑元素代理对象的实体类型。

## 功能特性

1. **自动检测**: 在 IFC 模型加载完成后自动检测所有 IfcBuildingElementProxy 对象
2. **详细信息**: 获取每个代理对象的完整属性信息，包括：
   - 基本属性（GlobalId, Name, Description 等）
   - 类型属性
   - 属性集
   - 材料属性
3. **手动触发**: 提供按钮手动触发调试功能
4. **控制台输出**: 所有信息以结构化格式输出到浏览器控制台

## 使用方法

### 1. 自动触发

当加载 IFC 模型时，系统会在模型加载完成后自动调用调试功能，相关信息会输出到浏览器控制台。

### 2. 手动触发

在 BIM 查看器界面左上角有一个"打印 IFC 代理对象"按钮，点击即可手动触发调试功能。

### 3. 编程调用

```typescript
// 获取Viewer3D实例
const viewer = this.viewer

// 打印所有IfcBuildingElementProxy对象信息
await viewer.printAllIfcBuildingElementProxies()

// 或者获取数据而不打印
const proxyObjects = await viewer.getAllIfcBuildingElementProxies()
```

## 输出信息

调试功能会在控制台输出以下信息：

### 基本属性

- `expressID`: 对象的 Express ID
- `GlobalId`: 全局唯一标识符
- `Name`: 对象名称
- `Description`: 对象描述
- `ObjectType`: 对象类型
- `Tag`: 标签信息
- `PredefinedType`: 预定义类型

### 类型属性

- 对象的类型定义信息
- 类型相关的属性集

### 属性集

- 与对象关联的所有属性集
- 属性值信息

### 材料属性

- 对象的材料信息
- 材料属性集

## 技术实现

### 核心方法

1. **printAllIfcBuildingElementProxies(modelID?: number)**

   - 打印所有 IfcBuildingElementProxy 对象的详细信息
   - 可选参数 modelID 指定特定模型

2. **getAllIfcBuildingElementProxies(modelID?: number): Promise<any[]>**
   - 返回所有 IfcBuildingElementProxy 对象的数据数组
   - 不打印到控制台，仅返回数据

### IFC 类型常量

```typescript
const IFCBUILDINGELEMENTPROXY = 1095909175
```

### 模型 ID 获取

系统会自动从场景中查找所有 IFC 模型，如果未找到则使用默认 modelID 0。

## 错误处理

- 如果 IFC 加载器未初始化，会显示警告信息
- 如果获取特定对象属性失败，会记录错误但继续处理其他对象
- 如果模型检查失败，会记录错误信息

## 使用场景

1. **模型验证**: 检查 IFC 模型中的代理对象是否正确
2. **数据提取**: 获取代理对象的属性信息用于进一步处理
3. **调试分析**: 分析模型结构和对象关系
4. **质量检查**: 验证模型数据的完整性和正确性

## 注意事项

1. 此功能仅适用于 IFC 模型
2. 需要确保 IFC 加载器已正确初始化
3. 大量对象时可能影响性能，建议在开发环境使用
4. 控制台输出可能较多，建议使用浏览器控制台的过滤功能

## 扩展功能

可以根据需要扩展以下功能：

- 导出数据到文件
- 可视化显示代理对象
- 批量处理多个模型
- 自定义属性过滤
