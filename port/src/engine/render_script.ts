// Port of /render/custom.render_script (the shipped render script) on the port's renderer.
// render.draw(pred) only ever has "gui"-tagged objects to draw in this game: the
// tile, particle and text predicates match nothing (the font material is tagged "gui").
import { Vector3, Vector4 } from './api';
import { engine, URL } from './runtime';
import { Renderer, orthographic, BLEND_SRC_ALPHA, BLEND_ONE_MINUS_SRC_ALPHA } from './gl';
import { identity, mulM, M4, f } from './math32';
import { sys } from './apis';
import { literal } from '../lua/table';

export class RenderScript {
  renderer: Renderer;
  /** display.width/height */
  width: number; height: number;
  windowWidth = 0; windowHeight = 0;
  self: any = {};

  constructor(renderer: Renderer, width: number, height: number) {
    this.renderer = renderer;
    this.width = width; this.height = height;
  }

  private fixedProjection(near: number, far: number, zoom?: number): M4 {
    const z = zoom ?? 1;
    const pw = this.windowWidth / z, ph = this.windowHeight / z;
    const xo = -(pw - this.width) / 2, yo = -(ph - this.height) / 2;
    return orthographic(xo, xo + pw, yo, yo + ph, near, far);
  }
  private fixedFitProjection(near: number, far: number): M4 {
    const zoom = Math.min(this.windowWidth / this.width, this.windowHeight / this.height);
    return this.fixedProjection(near, far, zoom);
  }
  private stretchProjection(near: number, far: number): M4 { return orthographic(0, this.width, 0, this.height, near, far); }

  init() {
    const s = this.self;
    s.clear_color = new Vector4(0, 0, 0, 0);
    s.clear_color.x = Number(sys.get_config('render.clear_color_red', '0'));
    s.clear_color.y = Number(sys.get_config('render.clear_color_green', '0'));
    s.clear_color.z = Number(sys.get_config('render.clear_color_blue', '0'));
    s.clear_color.w = Number(sys.get_config('render.clear_color_alpha', '0'));
    s.view = identity();
    s.near = -1;
    s.far = 1;
    s.projection_fn = (n: number, fa: number) => this.stretchProjection(n, fa);
  }

  update(_dt: number) {
    const r = this.renderer;
    const gl = r.gl;
    const s = this.self;
    r.setDepthMask(true);
    r.setStencilMask(0xff);
    const cc = s.clear_color as Vector4;
    // dmGraphics::Clear takes the colour as bytes
    const q = (v: number) => (Math.trunc(f(v * 255)) & 0xff) / 255;
    r.clear([q(cc.x), q(cc.y), q(cc.z), q(cc.w)], 1, 0);
    r.setViewport(0, 0, this.windowWidth, this.windowHeight);
    r.setDepthMask(false);
    r.enableState(gl.DEPTH_TEST, false);
    r.enableState(gl.STENCIL_TEST, false);
    r.enableState(gl.BLEND, true);
    r.setBlendFunc(BLEND_SRC_ALPHA, BLEND_ONE_MINUS_SRC_ALPHA);
    r.enableState(gl.CULL_FACE, false);
    s.projection_fn(s.near, s.far, s.zoom);
    // tile, particle and debug3d predicates draw nothing in this game
    const proj = orthographic(0, this.windowWidth, 0, this.windowHeight, -1, 1);
    r.setViewProj(mulM(proj, identity()));
    r.enableState(gl.STENCIL_TEST, true);
    r.drawRenderList(); // gui predicate
    // text predicate: nothing carries the "text" tag
    r.enableState(gl.STENCIL_TEST, false);
  }

  on_message(id: string, message: any, _sender: URL) {
    const s = this.self;
    if (id === 'clear_color') {
      s.clear_color = message.color;
    } else if (id === 'set_view_projection') {
      s.view = message.view; s.projection = message.projection;
    } else if (id === 'use_camera_projection') {
      s.projection_fn = () => s.projection ?? identity();
    } else if (id === 'use_stretch_projection') {
      s.near = message.near ?? -1; s.far = message.far ?? 1;
      s.projection_fn = (n: number, fa: number) => this.stretchProjection(n, fa);
    } else if (id === 'use_fixed_projection') {
      s.near = message.near ?? -1; s.far = message.far ?? 1; s.zoom = message.zoom ?? 1;
      s.projection_fn = (n: number, fa: number, z: number) => this.fixedProjection(n, fa, z);
    } else if (id === 'use_fixed_fit_projection') {
      s.near = message.near ?? -1; s.far = message.far ?? 1;
      s.projection_fn = (n: number, fa: number) => this.fixedFitProjection(n, fa);
    } else if (id === 'window_resized') {
      engine.post(engine.resolve('main:/menu#controller'), 'window_resized', message, new URL('@render', '', undefined));
    } else if (id === 'get_dimensions') {
      console.log('[lua] GET_DIMENSIONS');
      engine.post(engine.resolve(message.callback), 'window_dimensions', literal({
        original_width: this.width, original_height: this.height, width: this.windowWidth, height: this.windowHeight,
      }), new URL('@render', '', undefined));
    }
  }
}

export { Vector3 };
