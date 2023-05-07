// 頂点シェーダー
const vertexShaderWGSL = `
// 頂点シェーダのWGSLコード
struct VertexOutput {
    @builtin(position) Position : vec4<f32>,
    @location(0) fragColor : vec4<f32>,
  }

  @vertex
  fn main(
    @location(0) position: vec4<f32>,
    @location(1) color: vec4<f32>
  ) -> VertexOutput {

    var output : VertexOutput;
    output.Position = position;
    output.fragColor = color;

    return output;
  }
`;
// フラグメントシェーダー
const fragmentShaderWGSL = `
// フラグメントシェーダのWGSLコード
@fragment
fn main(
  @location(0) fragColor: vec4<f32>,
) -> @location(0) vec4<f32> {
  return fragColor;
}
`;

const quadVertesSize     = 4*8; // quadVertexArrayの1vertesのバイトサイズ
const quadPositionOffset = 4*0; // quadVertexArrayのpostionデータ先頭位置
const quadColorOffset    = 4*4; // quadVertexArrayのcolorデータ先頭位置
const quadVertexCount    = 6;
const quadVertexArray    = new Float32Array([
    // position, color
    -1,  1, 0, 1.0,   0, 1, 0, 1,
    -1, -1, 0, 1.0,   0, 0, 0, 1,
     1, -1, 0, 1.0,   1, 0, 0, 1,
    -1,  1, 0, 1.0,   0, 1, 0, 1,
     1, -1, 0, 1.0,   1, 0, 0, 1,
     1,  1, 0, 1.0,   1, 1, 0, 1,
]);

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

  // create a vertex buffer from the cub data
  const verticesBuffer = device.createBuffer({
    size: quadVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  // set data
  new Float32Array(verticesBuffer.getMappedRange()).set(quadVertexArray);
  // メモリマッピング解除
  verticesBuffer.unmap();

  // 頂点シェーダーのコンパイル
  const vertexState = {
    module: device.createShaderModule({code: vertexShaderWGSL}),
      entryPoint: "main",
      buffers: [
        {
            // 配列要素間距離[byte]
            arrayStride: quadVertesSize,
            // 頂点バッファ属性
            attributes: [
                {
                    // position
                    shaderLocation: 0,
                    offset: quadPositionOffset,
                    format: 'float32x4',
                },
                {
                    // color
                    shaderLocation: 1,
                    offset: quadColorOffset,
                    format: 'float32x4',
                },
            ]
        }
      ]
  };
  if (vertexState.module.compilationInfo) {
    console.log(await vertexState.module.compilationInfo());
  };
  // フラグメントシェーダのコンパイル
  const fragmentState = {
    module: device.createShaderModule({code: fragmentShaderWGSL}),
    entryPoint: "main",
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
    },
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
  // set GPUBuffer
  passEncoder.setVertexBuffer(0, verticesBuffer);
  // drawコール
  passEncoder.draw(quadVertexCount, 1, 0, 0);
  // レンダリングコマンド終了
  passEncoder.end();

  // コマンドをGPUキューに追加
  device.queue.submit([commandEncoder.finish()]);
}

// 描画関数
window.addEventListener('DOMContentLoaded', init);
