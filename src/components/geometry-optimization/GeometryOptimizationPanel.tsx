import React, { useState, useEffect } from "react";
import classes from "./GeometryOptimizationPanel.module.scss";

interface OptimizationStats {
  totalObjects: number;
  visibleObjects: number;
  totalTriangles: number;
  renderedTriangles: number;
  totalVertices: number;
  renderedVertices: number;
  culledObjects: number;
  triangleReduction: string;
  vertexReduction: string;
  cullingRatio: string;
  lodLevel0: number;
  lodLevel1: number;
  lodLevel2: number;
  lodLevel3: number;
  textureStats?: {
    totalTextures: number;
    memoryUsageMB: number;
    compressionRatio: string;
    cacheHitRate: string;
    mipmapTextures: number;
  };
}

interface Props {
  viewer3D?: any;
  visible?: boolean;
  onClose?: () => void;
}

export const GeometryOptimizationPanel: React.FC<Props> = ({
  viewer3D,
  visible = false,
  onClose,
}) => {
  const [stats, setStats] = useState<OptimizationStats | null>(null);
  const [optimizationEnabled, setOptimizationEnabled] = useState(true);

  useEffect(() => {
    if (!visible || !viewer3D) return;

    const updateStats = () => {
      const optimizationStats = viewer3D.getGeometryOptimizationStats();
      if (optimizationStats) {
        setStats(optimizationStats);
      }
    };

    // 初始化获取数据
    updateStats();

    // 设置定时更新
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, [visible, viewer3D]);

  const handleOptimizationToggle = () => {
    const newEnabled = !optimizationEnabled;
    setOptimizationEnabled(newEnabled);

    if (viewer3D) {
      viewer3D.setGeometryOptimizationEnabled(newEnabled);
    }
  };

  const handleConfigChange = (key: string, value: any) => {
    if (viewer3D) {
      viewer3D.updateGeometryOptimizationConfig({ [key]: value });
    }
  };

  if (!visible) return null;

  return (
    <div className={classes.panel}>
      <div className={classes.header}>
        <h3>几何体优化面板</h3>
        <button className={classes.closeBtn} onClick={onClose}>
          ×
        </button>
      </div>

      <div className={classes.content}>
        {/* 优化控制 */}
        <div className={classes.section}>
          <h4>优化控制</h4>
          <div className={classes.control}>
            <label>
              <input
                type="checkbox"
                checked={optimizationEnabled}
                onChange={handleOptimizationToggle}
              />
              启用几何体优化
            </label>
          </div>
        </div>

        {/* 统计信息 */}
        {stats && (
          <div className={classes.section}>
            <h4>性能统计</h4>

            <div className={classes.statsGrid}>
              <div className={classes.statItem}>
                <span className={classes.label}>总对象数:</span>
                <span className={classes.value}>{stats.totalObjects}</span>
              </div>

              <div className={classes.statItem}>
                <span className={classes.label}>可见对象:</span>
                <span className={classes.value}>{stats.visibleObjects}</span>
              </div>

              <div className={classes.statItem}>
                <span className={classes.label}>剔除对象:</span>
                <span className={classes.value}>{stats.culledObjects}</span>
              </div>

              <div className={classes.statItem}>
                <span className={classes.label}>剔除率:</span>
                <span className={classes.value}>{stats.cullingRatio}</span>
              </div>
            </div>

            <h5>三角面优化</h5>
            <div className={classes.statsGrid}>
              <div className={classes.statItem}>
                <span className={classes.label}>总三角面:</span>
                <span className={classes.value}>
                  {stats.totalTriangles.toLocaleString()}
                </span>
              </div>

              <div className={classes.statItem}>
                <span className={classes.label}>渲染三角面:</span>
                <span className={classes.value}>
                  {stats.renderedTriangles.toLocaleString()}
                </span>
              </div>

              <div className={classes.statItem}>
                <span className={classes.label}>减少率:</span>
                <span className={`${classes.value} ${classes.highlight}`}>
                  {stats.triangleReduction}
                </span>
              </div>
            </div>

            <h5>顶点优化</h5>
            <div className={classes.statsGrid}>
              <div className={classes.statItem}>
                <span className={classes.label}>总顶点:</span>
                <span className={classes.value}>
                  {stats.totalVertices.toLocaleString()}
                </span>
              </div>

              <div className={classes.statItem}>
                <span className={classes.label}>渲染顶点:</span>
                <span className={classes.value}>
                  {stats.renderedVertices.toLocaleString()}
                </span>
              </div>

              <div className={classes.statItem}>
                <span className={classes.label}>减少率:</span>
                <span className={`${classes.value} ${classes.highlight}`}>
                  {stats.vertexReduction}
                </span>
              </div>
            </div>

            <h5>LOD 分布</h5>
            <div className={classes.lodStats}>
              <div className={classes.lodItem}>
                <span>LOD 0 (高精度):</span>
                <span>{stats.lodLevel0}</span>
              </div>
              <div className={classes.lodItem}>
                <span>LOD 1 (中高精度):</span>
                <span>{stats.lodLevel1}</span>
              </div>
              <div className={classes.lodItem}>
                <span>LOD 2 (中精度):</span>
                <span>{stats.lodLevel2}</span>
              </div>
              <div className={classes.lodItem}>
                <span>LOD 3 (低精度):</span>
                <span>{stats.lodLevel3}</span>
              </div>
            </div>

            {/* 纹理优化统计 */}
            {stats.textureStats && (
              <>
                <h5>纹理优化</h5>
                <div className={classes.statsGrid}>
                  <div className={classes.statItem}>
                    <span className={classes.label}>纹理总数:</span>
                    <span className={classes.value}>
                      {stats.textureStats.totalTextures}
                    </span>
                  </div>

                  <div className={classes.statItem}>
                    <span className={classes.label}>内存使用:</span>
                    <span className={classes.value}>
                      {stats.textureStats.memoryUsageMB.toFixed(1)} MB
                    </span>
                  </div>

                  <div className={classes.statItem}>
                    <span className={classes.label}>压缩率:</span>
                    <span className={`${classes.value} ${classes.highlight}`}>
                      {stats.textureStats.compressionRatio}
                    </span>
                  </div>

                  <div className={classes.statItem}>
                    <span className={classes.label}>缓存命中率:</span>
                    <span className={`${classes.value} ${classes.highlight}`}>
                      {stats.textureStats.cacheHitRate}
                    </span>
                  </div>

                  <div className={classes.statItem}>
                    <span className={classes.label}>Mipmap纹理:</span>
                    <span className={classes.value}>
                      {stats.textureStats.mipmapTextures}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 优化配置 */}
        <div className={classes.section}>
          <h4>配置调整</h4>

          <div className={classes.configItem}>
            <label>简化率 (0.1-1.0):</label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              defaultValue="0.5"
              onChange={(e) =>
                handleConfigChange(
                  "simplificationRatio",
                  parseFloat(e.target.value)
                )
              }
            />
          </div>

          <div className={classes.configItem}>
            <label>剔除距离:</label>
            <input
              type="range"
              min="500"
              max="10000"
              step="500"
              defaultValue="5000"
              onChange={(e) =>
                handleConfigChange("cullingDistance", parseInt(e.target.value))
              }
            />
          </div>

          <div className={classes.control}>
            <label>
              <input
                type="checkbox"
                defaultChecked={true}
                onChange={(e) =>
                  handleConfigChange("enableLOD", e.target.checked)
                }
              />
              启用 LOD (多细节层次)
            </label>
          </div>

          <div className={classes.control}>
            <label>
              <input
                type="checkbox"
                defaultChecked={true}
                onChange={(e) =>
                  handleConfigChange("enableFrustumCulling", e.target.checked)
                }
              />
              启用视锥剔除
            </label>
          </div>

          <div className={classes.control}>
            <label>
              <input
                type="checkbox"
                defaultChecked={true}
                onChange={(e) =>
                  handleConfigChange("enableDistanceCulling", e.target.checked)
                }
              />
              启用距离剔除 (关闭此选项可防止大模型在远距离时消失)
            </label>
          </div>

          <h5>纹理优化配置</h5>

          <div className={classes.configItem}>
            <label>纹理最大尺寸:</label>
            <input
              type="range"
              min="256"
              max="2048"
              step="256"
              defaultValue="1024"
              onChange={(e) =>
                handleConfigChange("textureOptimization", {
                  maxTextureSize: parseInt(e.target.value),
                })
              }
            />
          </div>

          <div className={classes.configItem}>
            <label>纹理缓存大小 (MB):</label>
            <input
              type="range"
              min="64"
              max="1024"
              step="64"
              defaultValue="256"
              onChange={(e) =>
                handleConfigChange("textureOptimization", {
                  maxCacheSize: parseInt(e.target.value),
                })
              }
            />
          </div>

          <div className={classes.control}>
            <label>
              <input
                type="checkbox"
                defaultChecked={true}
                onChange={(e) =>
                  handleConfigChange("textureOptimization", {
                    enableCompression: e.target.checked,
                  })
                }
              />
              启用纹理压缩
            </label>
          </div>

          <div className={classes.control}>
            <label>
              <input
                type="checkbox"
                defaultChecked={true}
                onChange={(e) =>
                  handleConfigChange("textureOptimization", {
                    enableResolutionScaling: e.target.checked,
                  })
                }
              />
              启用分辨率缩放
            </label>
          </div>

          <div className={classes.control}>
            <label>
              <input
                type="checkbox"
                defaultChecked={true}
                onChange={(e) =>
                  handleConfigChange("textureOptimization", {
                    enableMipmaps: e.target.checked,
                  })
                }
              />
              启用 Mipmap
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeometryOptimizationPanel;
