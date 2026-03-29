/**
 * 计算着色器接口
 */
export interface IComputeShader {
  initialize(): Promise<void>
  dispatch(workgroups: [number, number, number]): Promise<void>
  dispose(): void
}

/**
 * 着色器语言类型
 */
export enum ShaderLanguage {
  WGSL = 'wgsl',
  GLSL = 'glsl'
}

/**
 * 计算着色器配置
 */
export interface ComputeShaderConfig {
  language: ShaderLanguage
  code: string
  entryPoint: string
  workgroupSize: [number, number, number]
}