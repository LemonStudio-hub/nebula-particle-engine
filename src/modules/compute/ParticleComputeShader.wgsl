// WGSL 粒子更新计算着色器
// 用于 WebGPU 后端

struct Uniforms {
  deltaTime: f32,
  gravityX: f32,
  gravityY: f32,
  gravityZ: f32,
  drag: f32,
  lifetime: f32,
  padding0: f32,
  padding1: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@group(0) @binding(1) var<storage, read> positionsIn: array<vec3<f32>>;
@group(0) @binding(2) var<storage, read_write> positionsOut: array<vec3<f32>>;
@group(0) @binding(3) var<storage, read_write> velocities: array<vec3<f32>>;
@group(0) @binding(4) var<storage, read_write> ages: array<f32>>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;

  // 检查粒子是否活跃（通过 age 判断）
  if (ages[index] < 0.0) {
    return;
  }

  // 更新年龄
  ages[index] = ages[index] + uniforms.deltaTime;

  // 检查生命周期
  if (ages[index] >= uniforms.lifetime) {
    ages[index] = -1.0; // 标记为不活跃
    return;
  }

  // 获取当前位置和速度
  let position = positionsIn[index];
  let velocity = velocities[index];

  // 应用重力加速度
  let gravity = vec3<f32>(uniforms.gravityX, uniforms.gravityY, uniforms.gravityZ);
  let newVelocity = velocity + gravity * uniforms.deltaTime;

  // 应用阻力
  let dragFactor = 1.0 - uniforms.drag * uniforms.deltaTime;
  let finalVelocity = newVelocity * max(dragFactor, 0.0);

  // 更新位置
  let newPosition = position + finalVelocity * uniforms.deltaTime;

  // 写入结果
  positionsOut[index] = newPosition;
  velocities[index] = finalVelocity;
}