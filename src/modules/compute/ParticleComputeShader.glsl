// GLSL Transform Feedback 粒子更新着色器
// 用于 WebGL 后端

#version 300 es

// 输入属性
in vec3 inPosition;
in vec3 inVelocity;
in float inAge;

// 输出变量（通过 Transform Feedback）
out vec3 outPosition;
out vec3 outVelocity;
out float outAge;

// Uniform 变量
uniform float uDeltaTime;
uniform vec3 uGravity;
uniform float uDrag;
uniform float uLifetime;

void main() {
  // 检查粒子是否活跃
  if (inAge < 0.0) {
    outPosition = inPosition;
    outVelocity = inVelocity;
    outAge = inAge;
    return;
  }

  // 更新年龄
  float newAge = inAge + uDeltaTime;

  // 检查生命周期
  if (newAge >= uLifetime) {
    outAge = -1.0; // 标记为不活跃
    outPosition = inPosition;
    outVelocity = inVelocity;
    return;
  }

  // 应用重力加速度
  vec3 newVelocity = inVelocity + uGravity * uDeltaTime;

  // 应用阻力
  float dragFactor = 1.0 - uDrag * uDeltaTime;
  vec3 finalVelocity = newVelocity * max(dragFactor, 0.0);

  // 更新位置
  vec3 newPosition = inPosition + finalVelocity * uDeltaTime;

  // 输出结果
  outPosition = newPosition;
  outVelocity = finalVelocity;
  outAge = newAge;
}