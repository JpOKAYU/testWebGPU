// 頂点シェーダー
const vertexShaderWGSL = `
// 頂点シェーダのWGSLコード
@vertex
fn main(
  @builtin(vertex_index) VertexIndex : u32
) -> @builtin(position) vec4<f32> {
  var pos = array<vec2<f32>, 3>(
    vec2<f32>(0.0, 0.5),
    vec2<f32>(-0.5, -0.5),
    vec2<f32>(0.5, -0.5)
  );
  return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
}
`;
// フラグメントシェーダー
const fragmentShaderWGSL = `
// フラグメントシェーダのWGSLコード
@fragment
fn main() -> @location(0) vec4<f32> {
  return vec4<f32>(1.0, 0.0, 0.0, 1.0);
}
`;

async function init() {
  // adapterの取得
  const adapter = await navigator.gpu?.requestAdapter();
  // 論理deviceの取得
  const device = await adapter?.requestDevice({});

  // キャンパスの設定
  const canvas = document.getElementById('myCanvas');
  canvas.width = canvas.style.width = innerWidth;
  canvas.height = canvas.style.height = innerHeight;

  // canvasからwebgpuコンテキストの取得
  const context = canvas.getContext('webgpu');

  if (!adapter || !device || !context) {
    notSupportedDescription.style.display = "block";
    canvas.style.display = "none";
    return;
  };
  notSupportedDescription.style.display = "none";
  canvas.style.display = "inline";

  // スワップチェ-ンのフォーマットを取得
  const swapChainFormat = navigator.gpu.getPreferredCanvasFormat();

  // コンテキストにデバイスとスワップチェーンフォーマットを設定
  const swapChain = context.configure({
    device: device,
    format: swapChainFormat,
  });
  // 頂点シェーダーのコンパイル
  const vertexState = {
    module: device.createShaderModule({code: vertexShaderWGSL}),
      entryPoint: "main"
  }
  if (vertexState.module.compilationInfo) {
    console.log(await vertexState.module.compilationInfo());
  }
  // フラグメントシェーダのコンパイル
  const fragmentState = {
    module: device.createShaderModule({code: fragmentShaderWGSL}),
    entryPoint: "main"
  }
  if (fragmentState.module.compilationInfo){
    console.log(await fragmentState.module.compilationInfo());
  }
  const gpuRenderPipelineDescriptor = {
    layout: "auto",
    vertex: vertexState,
    fragment: Object.assign(fragmentState, {
      // 描画対象のフォーマット
      targets: [{
        format: swapChainFormat
      }]
    }),
    primitive: {
      topology: "triangle-list"
    }
  };
  // pipelineの作成
  const pipeline = device.createRenderPipeline(gpuRenderPipelineDescriptor);
  const textureView    = context.getCurrentTexture().createView();
  // レンダリング設定のディスクリプタをオブジェクト形式で定義
  const renderPassDescriptor = {
    colorAttachments: [{
      clearValue: {r: 0.3, g: 0.6, b: 0.8, a: 1.0},
      loadOp:  "clear",
      storeOp: "store",
      view:    textureView,
    }]
  };

  // 三角形をレンダリング
  // GPUコマンド列を作成
  const commandEncoder = device.createCommandEncoder({});
  // レンダリング設定のディスクリプタに、描画対象キャンバスのテクスチャビューを設定。
  // これはレンダリングのたびに実行する必要がある。
  renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

  // レンダリングコマンドを作成
  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

  // パイプラインを設定
  passEncoder.setPipeline(pipeline);
  // drawコール
  passEncoder.draw(3, 1, 0, 0);
  // レンダリングコマンド終了
  passEncoder.end();

  // コマンドをGPUキューに追加
  device.queue.submit([commandEncoder.finish()]);
}

// 描画関数
window.addEventListener('DOMContentLoaded', init);
