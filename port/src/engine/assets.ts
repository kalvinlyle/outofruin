// Loads the exported Defold resources from game/port/assets (see tools/port/README.md).

export interface AssetBundle {
  base: string;
  render: any;
  collection: any;
  inputBinding: any;
  scenes: Map<string, any>;          // "/main/kingdom/kingdom.guic" -> SceneDesc
  atlases: Map<string, any>;         // "/assets/main.texturesetc" -> TextureSet
  textures: Map<string, any>;        // "/assets/main.texturec" -> TextureImage json
  images: Map<string, ImageBitmap[]>; // texture path -> mip bitmaps
  fonts: Map<string, any>;           // "/fonts/X.fontc" -> FontMap json
  fontImages: Map<string, ImageBitmap>;
  materials: Map<string, any>;
  shaders: Map<string, string>;      // "builtins/materials/gui.vp" -> source
  data: Map<string, string>;         // "/data/Map.json" -> raw text
}

function stripC(path: string): string {
  // "/assets/main.texturesetc" -> "assets/main"
  return path.replace(/^\//, '').replace(/\.[a-z_]+c$/, '');
}

async function fetchText(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error('asset ' + url + ': ' + r.status);
  return r.text();
}
async function fetchJSON(url: string): Promise<any> { return JSON.parse(await fetchText(url)); }

/** Decode an image with no premultiplication, colour conversion or flip, so the bytes reach GL unchanged. */
export async function decodeImage(url: string): Promise<ImageBitmap> {
  const r = await fetch(url);
  if (!r.ok) throw new Error('asset ' + url + ': ' + r.status);
  const blob = await r.blob();
  return createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none', imageOrientation: 'none' } as any);
}

function encodePath(p: string): string {
  return p.split('/').map(encodeURIComponent).join('/');
}

export async function loadAssets(base: string): Promise<AssetBundle> {
  const u = (p: string) => base + encodePath(p);
  const [render, collection, inputBinding, manifest] = await Promise.all([
    fetchJSON(u('render.json')), fetchJSON(u('collection.json')), fetchJSON(u('input_binding.json')), fetchJSON(u('manifest.json')),
  ]);
  const mf = manifest.files ?? {};
  const files: string[] = Array.isArray(mf)
    ? mf.map((f: any) => typeof f === 'string' ? f : (f.path ?? f.file ?? f.name))
    : Object.keys(mf);
  const b: AssetBundle = {
    base, render, collection, inputBinding,
    scenes: new Map(), atlases: new Map(), textures: new Map(), images: new Map(),
    fonts: new Map(), fontImages: new Map(), materials: new Map(), shaders: new Map(), data: new Map(),
  };
  const jobs: Promise<void>[] = [];
  for (const f of files) {
    if (!f) continue;
    if (f.startsWith('scenes/') && f.endsWith('.json')) {
      jobs.push(fetchJSON(u(f)).then((d) => { b.scenes.set(d.path, d); }));
    } else if (f.startsWith('atlases/') && f.endsWith('.json')) {
      jobs.push(fetchJSON(u(f)).then((d) => { b.atlases.set(d.path, d); }));
    } else if (f.startsWith('textures/') && f.endsWith('.json')) {
      jobs.push(fetchJSON(u(f)).then(async (d) => {
        b.textures.set(d.path, d);
        const alt = d.alternatives[0];
        const mips = await Promise.all(alt.mips.map((m: any) => decodeImage(u('textures/' + m.file))));
        b.images.set(d.path, mips);
      }));
    } else if (f.startsWith('fonts/') && f.endsWith('.json')) {
      jobs.push(fetchJSON(u(f)).then(async (d) => {
        b.fonts.set(d.path, d);
        const dir = f.slice(0, f.lastIndexOf('/') + 1);
        b.fontImages.set(d.path, await decodeImage(u(dir + d.cache_image)));
      }));
    } else if (f.startsWith('materials/') && f.endsWith('.json')) {
      jobs.push(fetchJSON(u(f)).then((d) => { b.materials.set(d.path, d); }));
    } else if (f.startsWith('shaders/')) {
      jobs.push(fetchText(u(f)).then((s) => { b.shaders.set(f.slice('shaders/'.length), s); }));
    } else if (f.startsWith('data/')) {
      jobs.push(fetchText(u(f)).then((s) => { b.data.set('/' + f, s); }));
    }
  }
  await Promise.all(jobs);
  return b;
}

export { stripC };
