/* ─────────────────────────────────────────────
   upscaler.js — Upscaling via Canvas, WebGL, and WASM
   Designed to upscale low-res PNG emojis on-the-fly.
   ───────────────────────────────────────────── */

let wasmInstance = null;

// Initialize WASM Module
async function initWasm() {
  if (wasmInstance) return wasmInstance;
  try {
    const response = await fetch('js/upscaler.wasm');
    const bytes = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes);
    wasmInstance = instance;
    return wasmInstance;
  } catch (err) {
    console.error('Failed to initialize WASM upscaler:', err);
    return null;
  }
}

/**
 * Upscale using HTML5 Canvas API (Bilinear/Bicubic multi-step or High quality resize)
 */
async function upscaleCanvas(img, dstW, dstH) {
  const canvas = document.createElement('canvas');
  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = canvas.getContext('2d');
  
  if (window.createImageBitmap) {
    try {
      const bitmap = await createImageBitmap(img, {
        resizeWidth: dstW,
        resizeHeight: dstH,
        resizeQuality: 'high'
      });
      ctx.drawImage(bitmap, 0, 0);
      return canvas;
    } catch (_) {}
  }
  
  // Fallback step-up scaling
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  let currentW = img.naturalWidth || img.width;
  let currentH = img.naturalHeight || img.height;
  
  tempCanvas.width = currentW;
  tempCanvas.height = currentH;
  tempCtx.drawImage(img, 0, 0);
  
  while (currentW < dstW && currentH < dstH) {
    const nextW = Math.min(dstW, currentW * 2);
    const nextH = Math.min(dstH, currentH * 2);
    
    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = nextW;
    stepCanvas.height = nextH;
    const stepCtx = stepCanvas.getContext('2d');
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(tempCanvas, 0, 0, currentW, currentH, 0, 0, nextW, nextH);
    
    tempCanvas.width = nextW;
    tempCanvas.height = nextH;
    tempCtx.drawImage(stepCanvas, 0, 0);
    
    currentW = nextW;
    currentH = nextH;
  }
  
  ctx.drawImage(tempCanvas, 0, 0);
  return canvas;
}

/**
 * WebGL Upscaler Generic Helper
 */
function upscaleWebGLGeneric(img, dstW, dstH, fsSource) {
  const canvas = document.createElement('canvas');
  canvas.width = dstW;
  canvas.height = dstH;
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    return upscaleCanvas(img, dstW, dstH);
  }

  const vsSource = `
    attribute vec2 position;
    varying vec2 v_texCoord;
    void main() {
      v_texCoord = position * 0.5 + 0.5;
      v_texCoord.y = 1.0 - v_texCoord.y;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return upscaleCanvas(img, dstW, dstH);
  }

  gl.useProgram(program);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,   1, -1,  -1,  1,
    -1,  1,   1, -1,   1,  1,
  ]), gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

  const uImage = gl.getUniformLocation(program, 'u_image');
  const uTextureSize = gl.getUniformLocation(program, 'u_textureSize');

  gl.uniform1i(uImage, 0);
  gl.uniform2f(uTextureSize, img.naturalWidth || img.width, img.naturalHeight || img.height);

  gl.viewport(0, 0, dstW, dstH);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  return canvas;
}

/**
 * Standard WebGL Bicubic Interpolation
 */
function upscaleWebGL(img, dstW, dstH) {
  const fsSource = `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    uniform vec2 u_textureSize;

    vec4 cubic(float v) {
      vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
      vec4 s = n * n * n;
      float x = s.x;
      float y = s.y - 4.0 * s.x;
      float z = s.z - 4.0 * s.y + 6.0 * s.x;
      float w = 6.0 - x - y - z;
      return vec4(x, y, z, w) * (1.0/6.0);
    }

    void main() {
      vec2 texCoords = v_texCoord * u_textureSize - 0.5;
      vec2 fxy = fract(texCoords);
      texCoords -= fxy;

      vec4 xcubic = cubic(fxy.x);
      vec4 ycubic = cubic(fxy.y);

      vec4 c = texCoords.xxyy + vec2(-0.5, 1.5).xyxy;
      vec4 s = vec4(xcubic.xz + xcubic.yw, ycubic.xz + ycubic.yw);
      vec4 offset = c + vec4(xcubic.yw, ycubic.yw) / s;

      offset /= u_textureSize.xxyy;

      vec4 sample0 = texture2D(u_image, offset.xz);
      vec4 sample1 = texture2D(u_image, offset.yz);
      vec4 sample2 = texture2D(u_image, offset.xw);
      vec4 sample3 = texture2D(u_image, offset.yw);

      float sx = s.x / (s.x + s.y);
      float sy = s.z / (s.z + s.w);

      gl_FragColor = mix(mix(sample3, sample2, sx), mix(sample1, sample0, sx), sy);
    }
  `;
  return upscaleWebGLGeneric(img, dstW, dstH, fsSource);
}

/**
 * WebGL + Unsharp Mask + Bicubic Upscale
 * Applies sharpening to high-frequency details extracted via box blur.
 */
function upscaleWebGLUnsharp(img, dstW, dstH) {
  const fsSource = `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    uniform vec2 u_textureSize;

    vec4 bicubicSample(vec2 uv) {
      vec2 texCoords = uv * u_textureSize - 0.5;
      vec2 fxy = fract(texCoords);
      texCoords -= fxy;

      vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - fxy.x;
      vec4 s_x = n * n * n;
      vec4 xcubic = vec4(s_x.x, s_x.y - 4.0 * s_x.x, s_x.z - 4.0 * s_x.y + 6.0 * s_x.x, 6.0 - s_x.x - (s_x.y - 4.0 * s_x.x) - (s_x.z - 4.0 * s_x.y + 6.0 * s_x.x)) * (1.0/6.0);

      n = vec4(1.0, 2.0, 3.0, 4.0) - fxy.y;
      vec4 s_y = n * n * n;
      vec4 ycubic = vec4(s_y.x, s_y.y - 4.0 * s_y.x, s_y.z - 4.0 * s_y.y + 6.0 * s_y.x, 6.0 - s_y.x - (s_y.y - 4.0 * s_y.x) - (s_y.z - 4.0 * s_y.y + 6.0 * s_y.x)) * (1.0/6.0);

      vec4 c = texCoords.xxyy + vec2(-0.5, 1.5).xyxy;
      vec4 s = vec4(xcubic.xz + xcubic.yw, ycubic.xz + ycubic.yw);
      vec4 offset = c + vec4(xcubic.yw, ycubic.yw) / s;

      offset /= u_textureSize.xxyy;

      vec4 sample0 = texture2D(u_image, offset.xz);
      vec4 sample1 = texture2D(u_image, offset.yz);
      vec4 sample2 = texture2D(u_image, offset.xw);
      vec4 sample3 = texture2D(u_image, offset.yw);

      float sx = s.x / (s.x + s.y);
      float sy = s.z / (s.z + s.w);

      return mix(mix(sample3, sample2, sx), mix(sample1, sample0, sx), sy);
    }

    void main() {
      vec4 center = bicubicSample(v_texCoord);
      
      // Compute unsharp mask using neighbor offsets
      vec2 offset = 1.2 / u_textureSize;
      vec4 blur = bicubicSample(v_texCoord + vec2(-offset.x, 0.0)) +
                  bicubicSample(v_texCoord + vec2(offset.x, 0.0)) +
                  bicubicSample(v_texCoord + vec2(0.0, -offset.y)) +
                  bicubicSample(v_texCoord + vec2(0.0, offset.y));
      blur /= 4.0;

      // Extract high frequency details
      vec4 details = center - blur;

      // Add details back (sharpening amount 1.5x)
      gl_FragColor = center + details * 1.5;
    }
  `;
  return upscaleWebGLGeneric(img, dstW, dstH, fsSource);
}

/**
 * WebGL + Filters (glfx.js Emulation)
 * Applies bicubic upscale, contrast boost, saturation boost, and brightness correction.
 */
function upscaleWebGLFilterPro(img, dstW, dstH) {
  const fsSource = `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    uniform vec2 u_textureSize;

    vec4 bicubicSample(vec2 uv) {
      vec2 texCoords = uv * u_textureSize - 0.5;
      vec2 fxy = fract(texCoords);
      texCoords -= fxy;

      vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - fxy.x;
      vec4 s_x = n * n * n;
      vec4 xcubic = vec4(s_x.x, s_x.y - 4.0 * s_x.x, s_x.z - 4.0 * s_x.y + 6.0 * s_x.x, 6.0 - s_x.x - (s_x.y - 4.0 * s_x.x) - (s_x.z - 4.0 * s_x.y + 6.0 * s_x.x)) * (1.0/6.0);

      n = vec4(1.0, 2.0, 3.0, 4.0) - fxy.y;
      vec4 s_y = n * n * n;
      vec4 ycubic = vec4(s_y.x, s_y.y - 4.0 * s_y.x, s_y.z - 4.0 * s_y.y + 6.0 * s_y.x, 6.0 - s_y.x - (s_y.y - 4.0 * s_y.x) - (s_y.z - 4.0 * s_y.y + 6.0 * s_y.x)) * (1.0/6.0);

      vec4 c = texCoords.xxyy + vec2(-0.5, 1.5).xyxy;
      vec4 s = vec4(xcubic.xz + xcubic.yw, ycubic.xz + ycubic.yw);
      vec4 offset = c + vec4(xcubic.yw, ycubic.yw) / s;

      offset /= u_textureSize.xxyy;

      vec4 sample0 = texture2D(u_image, offset.xz);
      vec4 sample1 = texture2D(u_image, offset.yz);
      vec4 sample2 = texture2D(u_image, offset.xw);
      vec4 sample3 = texture2D(u_image, offset.yw);

      float sx = s.x / (s.x + s.y);
      float sy = s.z / (s.z + s.w);

      return mix(mix(sample3, sample2, sx), mix(sample1, sample0, sx), sy);
    }

    void main() {
      vec4 color = bicubicSample(v_texCoord);

      // 1. Contrast Adjustment (factor = 1.15)
      color.rgb = (color.rgb - 0.5) * 1.15 + 0.5;

      // 2. Saturation Boost (factor = 1.25)
      float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      color.rgb = mix(vec3(luma), color.rgb, 1.25);

      // 3. Brightness adjustment
      color.rgb += 0.02;

      gl_FragColor = clamp(color, 0.0, 1.0);
    }
  `;
  return upscaleWebGLGeneric(img, dstW, dstH, fsSource);
}

/**
 * Generic WebAssembly Invoker helper
 */
async function upscaleWasmGeneric(img, dstW, dstH, wasmFuncName) {
  const instance = await initWasm();
  if (!instance) {
    return upscaleCanvas(img, dstW, dstH);
  }

  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext('2d');
  srcCtx.drawImage(img, 0, 0);
  const srcImgData = srcCtx.getImageData(0, 0, srcW, srcH);
  const srcBytes = srcImgData.data;

  const memory = instance.exports.memory;
  const srcSize = srcW * srcH * 4;
  const dstSize = dstW * dstH * 4;

  const srcPtr = 8;
  const dstPtr = srcPtr + srcSize + 8;

  // Make sure WASM memory has enough pages
  const requiredMemoryBytes = dstPtr + dstSize;
  const currentPages = memory.buffer.byteLength / 65536;
  const requiredPages = Math.ceil(requiredMemoryBytes / 65536);
  if (requiredPages > currentPages) {
    memory.grow(requiredPages - currentPages);
  }

  const wasmMemBuffer = new Uint8Array(memory.buffer);
  wasmMemBuffer.set(srcBytes, srcPtr);

  // Invoke the selected WASM function
  instance.exports[wasmFuncName](srcPtr, srcW, srcH, dstPtr, dstW, dstH);

  const dstBytes = wasmMemBuffer.slice(dstPtr, dstPtr + dstSize);

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = dstW;
  dstCanvas.height = dstH;
  const dstCtx = dstCanvas.getContext('2d');
  const dstImgData = dstCtx.createImageData(dstW, dstH);
  dstImgData.data.set(dstBytes);
  dstCtx.putImageData(dstImgData, 0, 0);

  return dstCanvas;
}

/**
 * Standard WASM bilinear upscale
 */
function upscaleWasm(img, dstW, dstH) {
  return upscaleWasmGeneric(img, dstW, dstH, 'upscale_bilinear');
}

/**
 * Waifu2x WASM Emulation
 */
function upscaleWasmWaifu2x(img, dstW, dstH) {
  return upscaleWasmGeneric(img, dstW, dstH, 'waifu2x_wasm');
}

/**
 * Real-ESRGAN Lite WASM Emulation
 */
function upscaleWasmEsrgan(img, dstW, dstH) {
  return upscaleWasmGeneric(img, dstW, dstH, 'esrgan_wasm');
}

/**
 * OpenCV.js WASM Emulation
 */
function upscaleWasmOpencv(img, dstW, dstH) {
  return upscaleWasmGeneric(img, dstW, dstH, 'opencv_wasm');
}
