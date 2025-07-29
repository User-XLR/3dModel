# 3D 模型查看器

一个基于 Three.js 的 3D 模型查看器，支持多种 3D 文件格式的加载和查看。

## 功能特性

### 基础功能

- 支持多种 3D 文件格式：GLTF/GLB、FBX、OBJ、STL、PLY、DAE、IFC、SHP
- 3D 场景交互：旋转、缩放、平移
- 模型选择和高亮
- 材质管理
- 性能监控

### 新增功能：模型注释系统

#### 功能描述

- **双击模型部位**：在 3D 场景中双击模型的任意部位
- **弹出配置弹框**：使用原生样式绘制的配置弹框，包含以下配置项：
  - 标题（必填）
  - 描述（可选）
  - 类型（信息、警告、错误、成功）
  - 优先级（低、中、高、紧急）
  - 颜色选择器
- **指示牌显示**：确认配置后，在点击位置显示指示牌，包含配置的信息

#### 使用方法

1. 在 3D 场景中双击任意模型部位
2. 在弹出的配置弹框中填写指示牌信息
3. 点击"确认"按钮，指示牌将出现在点击位置
4. 指示牌会跟随相机视角自动调整位置

#### 技术实现

- 使用 Three.js 的 Raycaster 进行鼠标点击检测
- 原生 HTML/CSS 实现弹框和指示牌样式
- 实时更新指示牌位置以跟随相机视角
- 支持多种类型和优先级的视觉区分

## 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run serve

# 构建生产版本
npm run build
```

## 项目结构

```
src/
├── components/
│   ├── annotation/           # 注释功能组件
│   │   ├── AnnotationConfigModal.tsx    # 配置弹框
│   │   ├── AnnotationConfigModal.module.scss
│   │   ├── AnnotationLabel.tsx          # 指示牌组件
│   │   └── AnnotationLabel.module.scss
│   └── viewer-container/     # 3D查看器容器
├── core/
│   ├── annotation/          # 注释管理器
│   │   └── AnnotationManager.ts
│   └── Viewer3D.ts         # 核心3D查看器
```

## 技术栈

- Vue.js 2.x
- TypeScript
- Three.js
- SCSS
- Element UI
