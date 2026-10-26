import { Scene, Vector3 } from '@babylonjs/core';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import '@babylonjs/core/Physics/joinedPhysicsEngineComponent';
import HavokPhysics from '@babylonjs/havok';

export async function initializeScenePhysics(scene: Scene): Promise<HavokPlugin> {
  const base = import.meta.env?.BASE_URL ?? '/';
  const wasmPath = `${base.replace(/\/+$/, '')}/wasm/HavokPhysics.wasm`;
  const havokInstance = await HavokPhysics({
    locateFile: () => wasmPath,
  });
  const havokPlugin = new HavokPlugin(true, havokInstance);
  scene.enablePhysics(new Vector3(0, -18, 0), havokPlugin);
  return havokPlugin;
}
