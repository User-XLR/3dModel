# 批注指示牌功能

## 功能概述

为 Tag 值为"923456"的 IFC 结构对象创建批注指示牌，采用一条线加一个长方形的设计，长方形内显示基础信息。

## 指示牌特性

### 1. 视觉设计

- 📋 **长方形指示牌** - 简洁的长方形设计，2.5x1.2 单位
- 🔴 **红色边框** - 醒目的红色边框，突出显示
- 🔗 **单线连接** - 简洁的红色连接线连接对象和指示牌
- ✨ **动画效果** - 光晕和悬停动画效果

### 2. 信息显示

- **Tag 值** - 显示"Tag: 923456"
- **对象名称** - 显示 IFC 对象的 Name 属性
- **对象类型** - 显示 IFC 对象的类型信息

### 3. 动态特性

- 🔄 **自动朝向** - 指示牌始终面向摄像机
- 📍 **精确定位** - 自动计算并放置在对象上方
- 🎯 **跟随对象** - 指示牌跟随对象移动

## 技术实现

### 核心组件

#### 1. 长方形指示牌

```javascript
// 创建长方形指示牌背景
const rectangleGeometry = new THREE.PlaneGeometry(2.8, 1.4)
const rectangleMaterial = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.0,
  side: THREE.DoubleSide
})
```

#### 2. CSS2D 文字标签

```javascript
// 创建HTML标签
const labelDiv = document.createElement('div')
labelDiv.className = 'annotation-indicator'
// 使用外部CSS样式文件定义简洁的样式
```

#### 3. 连接线

```javascript
// 创建单条连接线
const lineGeometry = new THREE.BufferGeometry().setFromPoints([
  objectTop,
  indicatorPosition.clone().add(new THREE.Vector3(0, -0.3, 0))
])
const lineMaterial = new THREE.LineBasicMaterial({
  color: 0xe74c3c,
  linewidth: 2,
  transparent: true,
  opacity: 0.9
})
```

### 自动更新机制

#### 指示牌朝向更新

```javascript
private updateAnnotationLabels() {
  this.scene.traverse((object) => {
    if (object.userData.annotationLabel) {
      const indicatorGroup = object.userData.annotationLabel as THREE.Group;
      indicatorGroup.children.forEach((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          child.lookAt(this.camera!.position);
        }
      });
    }
  });
}
```

#### 渲染循环集成

```javascript
animate() {
  // 更新标签牌方向，使其始终面向摄像机
  this.updateAnnotationLabels();

  // 其他渲染逻辑...
}
```

## 使用方法

### 1. 自动创建

- 加载 IFC 模型后自动扫描
- 为 Tag 值为"923456"的对象自动创建批注指示牌
- 无需手动操作

### 2. 查看指示牌

- 在 3D 场景中，特殊对象上方会显示红色长方形指示牌
- 指示牌包含 Tag 值、对象名称和类型信息
- 指示牌始终面向摄像机，便于阅读

### 3. 交互功能

- 点击对象可查看详细属性信息
- 指示牌不会阻挡对象选择
- 支持缩放和旋转，指示牌保持可见

## 指示牌样式

### 背景样式

- 颜色：透明背景
- 透明度：完全透明
- 尺寸：2.8 x 1.4 单位
- 边框：青色 (#00ffff)，2 像素宽度

### 文字样式

- 字体：11px，中等粗细
- 颜色：白色
- 布局：居中对齐
- 阴影：添加阴影效果增强可读性

### 连接线样式

- 颜色：红色 (#e74c3c)
- 透明度：90%
- 宽度：2 像素
- 连接：从对象顶部到指示牌底部

## 性能优化

### 1. 渲染优化

- 只在需要时更新标签朝向
- 使用 CSS2D 渲染器提高文字渲染性能
- 标签牌使用简单几何体，减少 GPU 负担

### 2. 内存管理

- 标签牌引用保存在对象 userData 中
- 支持清理和移除标签牌
- 避免内存泄漏

### 3. 错误处理

- 检查场景和摄像机是否存在
- 安全的几何体计算
- 优雅的错误处理

## 扩展功能

### 1. 自定义样式

可以轻松修改标签牌样式：

```javascript
// 修改颜色
const labelMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00, // 改为绿色
  transparent: true,
  opacity: 0.9
})

// 修改尺寸
const labelGeometry = new THREE.PlaneGeometry(3, 1.5) // 更大的标签
```

### 2. 多种标签类型

可以支持不同类型的标签：

- 警告标签（红色）
- 信息标签（蓝色）
- 成功标签（绿色）

### 3. 交互功能

可以添加更多交互功能：

- 点击标签显示详细信息
- 悬停高亮效果
- 标签动画效果

## 故障排除

### 常见问题

1. **标签牌不显示**

   - 检查 IFC 模型是否包含 Tag 值为"923456"的对象
   - 确认 CSS2D 渲染器已正确初始化
   - 查看浏览器控制台错误信息

2. **标签牌位置不正确**

   - 检查对象包围盒计算是否正确
   - 确认标签位置计算逻辑
   - 验证摄像机位置

3. **性能问题**
   - 减少标签牌更新频率
   - 优化几何体复杂度
   - 使用更高效的渲染方法

### 调试信息

在浏览器控制台中可以看到详细的调试信息：

- 标签牌创建成功/失败状态
- 对象位置和标签位置信息
- 性能统计信息

## 总结

3D 标签牌功能提供了：

- ✅ 清晰的视觉标注
- ✅ 详细的信息显示
- ✅ 良好的用户体验
- ✅ 优秀的性能表现
- ✅ 易于扩展和维护

该功能现在可以正常使用，为 Tag 值为"923456"的 IFC 对象提供美观且实用的 3D 标签牌标注。
