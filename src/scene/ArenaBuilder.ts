import {
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  PointLight,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  Texture,
  Vector3,
} from '@babylonjs/core';

export interface ArenaData {
  spawnPoints: Vector3[];
  shadowGenerator: ShadowGenerator;
  brazierLights: PointLight[];
}

export class ArenaBuilder {
  static build(scene: Scene): ArenaData {
    // 1. Atmosphere: Gloomy Overcast Daylight & Heavy Fog (Quake 1 / Dark Forces Vibe)
    const fogAshGrey = new Color3(0.24, 0.25, 0.27);
    scene.clearColor = new Color4(0.24, 0.25, 0.27, 1.0);
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.038;
    scene.fogColor = fogAshGrey;
    scene.collisionsEnabled = true;

    // Diffuse overcast daylight (cold sky, damp muddy ground reflection)
    const hemiLight = new HemisphericLight(
      'overcastDaylight',
      new Vector3(0, 1, 0),
      scene
    );
    hemiLight.intensity = 0.65;
    hemiLight.diffuse = new Color3(0.42, 0.44, 0.46);
    hemiLight.groundColor = new Color3(0.20, 0.19, 0.18);

    // Filtered high-angle daylight casting soft shadows
    const dirLight = new DirectionalLight(
      'diffuseSun',
      new Vector3(-0.4, -1, -0.3).normalize(),
      scene
    );
    dirLight.position = new Vector3(16, 28, 14);
    dirLight.intensity = 0.45;
    dirLight.diffuse = new Color3(0.75, 0.76, 0.78);

    const shadowGenerator = new ShadowGenerator(1024, dirLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 16;

    // 2. Static Retro Textures & Materials (Nearest-neighbor point sampling for gritty Quake/PS1 pixel crunch)
    const floorTexture = new Texture(
      '/assets/textures/stone_floor.png',
      scene,
      false,
      true,
      Texture.NEAREST_SAMPLINGMODE
    );
    floorTexture.uScale = 16;
    floorTexture.vScale = 16;
    const floorMat = new StandardMaterial('retroFloorMat', scene);
    floorMat.diffuseTexture = floorTexture;
    floorMat.specularColor = new Color3(0.01, 0.01, 0.01);

    const wallTexture = new Texture(
      '/assets/textures/dungeon_wall.png',
      scene,
      false,
      true,
      Texture.NEAREST_SAMPLINGMODE
    );
    wallTexture.uScale = 8;
    wallTexture.vScale = 2.5;
    const wallMat = new StandardMaterial('retroWallMat', scene);
    wallMat.diffuseTexture = wallTexture;
    wallMat.specularColor = new Color3(0.01, 0.01, 0.01);

    const cryptTexture = new Texture(
      '/assets/textures/crypt_stone.png',
      scene,
      false,
      true,
      Texture.NEAREST_SAMPLINGMODE
    );
    cryptTexture.uScale = 3;
    cryptTexture.vScale = 3;
    const cryptMat = new StandardMaterial('retroCryptMat', scene);
    cryptMat.diffuseTexture = cryptTexture;
    cryptMat.specularColor = new Color3(0.01, 0.01, 0.01);

    const ironTexture = new Texture(
      '/assets/textures/rusted_iron.png',
      scene,
      false,
      true,
      Texture.NEAREST_SAMPLINGMODE
    );
    ironTexture.uScale = 2;
    ironTexture.vScale = 2;
    const ironMat = new StandardMaterial('retroIronMat', scene);
    ironMat.diffuseTexture = ironTexture;
    ironMat.specularColor = new Color3(0.12, 0.1, 0.08);

    const emberMat = new StandardMaterial('brazierEmberMat', scene);
    emberMat.diffuseColor = new Color3(1.0, 0.55, 0.1);
    emberMat.emissiveColor = new Color3(1.0, 0.45, 0.05);

    // 3. 40m x 40m Open Flagstone Floor
    const arenaSize = 40;
    const floor = MeshBuilder.CreateBox(
      'arenaFloor',
      { width: arenaSize, height: 1, depth: arenaSize },
      scene
    );
    floor.position.y = -0.5;
    floor.material = floorMat;
    floor.receiveShadows = true;
    floor.checkCollisions = true;
    floor.isPickable = true;
    new PhysicsAggregate(
      floor,
      PhysicsShapeType.BOX,
      { mass: 0, friction: 0.7, restitution: 0.15 },
      scene
    );

    // 4. Perimeter: Low Weathered Stone Parapet + Rusted Iron Spikes + Invisible Tall Collider
    const parapetHeight = 1.5;
    const parapetThickness = 0.8;
    const half = arenaSize / 2;

    const wallConfigs = [
      {
        name: 'parapetNorth',
        w: arenaSize + parapetThickness * 2,
        d: parapetThickness,
        x: 0,
        z: half + parapetThickness / 2,
        isAlongX: true,
      },
      {
        name: 'parapetSouth',
        w: arenaSize + parapetThickness * 2,
        d: parapetThickness,
        x: 0,
        z: -(half + parapetThickness / 2),
        isAlongX: true,
      },
      {
        name: 'parapetEast',
        w: parapetThickness,
        d: arenaSize,
        x: half + parapetThickness / 2,
        z: 0,
        isAlongX: false,
      },
      {
        name: 'parapetWest',
        w: parapetThickness,
        d: arenaSize,
        x: -(half + parapetThickness / 2),
        z: 0,
        isAlongX: false,
      },
    ];

    for (const cfg of wallConfigs) {
      // Visible stone parapet wall
      const wall = MeshBuilder.CreateBox(
        cfg.name,
        { width: cfg.w, height: parapetHeight, depth: cfg.d },
        scene
      );
      wall.position.set(cfg.x, parapetHeight / 2, cfg.z);
      wall.material = wallMat;
      wall.checkCollisions = true;
      wall.receiveShadows = true;
      wall.isPickable = true;
      shadowGenerator.addShadowCaster(wall);

      // Low wall physics
      new PhysicsAggregate(
        wall,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.6, restitution: 0.2 },
        scene
      );

      // Invisible tall safety boundary (6m tall) preventing player or ragdolls from escaping into void
      const invisibleCeilingWall = MeshBuilder.CreateBox(
        `${cfg.name}_invisibleBound`,
        { width: cfg.w, height: 6.0, depth: cfg.d },
        scene
      );
      invisibleCeilingWall.position.set(cfg.x, 3.0 + parapetHeight, cfg.z);
      invisibleCeilingWall.isVisible = false;
      invisibleCeilingWall.isPickable = false;
      invisibleCeilingWall.checkCollisions = true;
      new PhysicsAggregate(
        invisibleCeilingWall,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.4, restitution: 0.1 },
        scene
      );

      // Gothic rusted iron spikes along parapet top
      const spikeCount = 14;
      const step = arenaSize / spikeCount;
      for (let i = -spikeCount / 2; i <= spikeCount / 2; i++) {
        const spike = MeshBuilder.CreateCylinder(
          `${cfg.name}_spike_${i}`,
          {
            diameterTop: 0.02,
            diameterBottom: 0.12,
            height: 0.8,
            tessellation: 6,
          },
          scene
        );
        if (cfg.isAlongX) {
          spike.position.set(i * step, parapetHeight + 0.4, cfg.z);
        } else {
          spike.position.set(cfg.x, parapetHeight + 0.4, i * step);
        }
        spike.material = ironMat;
        spike.isPickable = false;
      }
    }

    // 5. Gothic Monoliths & Crypt Barricades
    const megaliths = [
      { x: -9, z: -9, w: 2.8, h: 3.8, d: 2.8 },
      { x: 9, z: -9, w: 2.8, h: 3.8, d: 2.8 },
      { x: -9, z: 9, w: 2.8, h: 3.8, d: 2.8 },
      { x: 9, z: 9, w: 2.8, h: 3.8, d: 2.8 },
    ];

    megaliths.forEach((obs, idx) => {
      // Main stone megalith body
      const pillar = MeshBuilder.CreateBox(
        `gothicMegalith_${idx}`,
        { width: obs.w, height: obs.h, depth: obs.d },
        scene
      );
      pillar.position.set(obs.x, obs.h / 2, obs.z);
      pillar.material = cryptMat;
      pillar.checkCollisions = true;
      pillar.receiveShadows = true;
      pillar.isPickable = true;
      shadowGenerator.addShadowCaster(pillar);
      new PhysicsAggregate(
        pillar,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.6, restitution: 0.2 },
        scene
      );

      // Rusted iron reinforcement bands clamped around the stone pillar
      for (const bandY of [obs.h * 0.35, obs.h * 0.75]) {
        const band = MeshBuilder.CreateBox(
          `pillarBand_${idx}_${bandY.toFixed(1)}`,
          { width: obs.w + 0.12, height: 0.22, depth: obs.d + 0.12 },
          scene
        );
        band.position.set(obs.x, bandY, obs.z);
        band.material = ironMat;
        band.isPickable = false;
      }
    });

    // Heavy crypt slab barricades
    const barricades = [
      { x: 0, z: -13, w: 4.6, h: 1.9, d: 1.4 },
      { x: 0, z: 13, w: 4.6, h: 1.9, d: 1.4 },
      { x: -13, z: 0, w: 1.4, h: 1.9, d: 4.6 },
      { x: 13, z: 0, w: 1.4, h: 1.9, d: 4.6 },
    ];

    barricades.forEach((obs, idx) => {
      const slab = MeshBuilder.CreateBox(
        `cryptBarricade_${idx}`,
        { width: obs.w, height: obs.h, depth: obs.d },
        scene
      );
      slab.position.set(obs.x, obs.h / 2, obs.z);
      slab.material = wallMat;
      slab.checkCollisions = true;
      slab.receiveShadows = true;
      slab.isPickable = true;
      shadowGenerator.addShadowCaster(slab);
      new PhysicsAggregate(
        slab,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.6, restitution: 0.2 },
        scene
      );

      // Iron top trim
      const ironCap = MeshBuilder.CreateBox(
        `barricadeCap_${idx}`,
        { width: obs.w + 0.08, height: 0.14, depth: obs.d + 0.08 },
        scene
      );
      ironCap.position.set(obs.x, obs.h + 0.07, obs.z);
      ironCap.material = ironMat;
      ironCap.isPickable = false;
    });

    // 6. 4 Gothic Iron Fire-Braziers with Dynamic Warm Amber Lights
    const brazierPositions = [
      new Vector3(-5.5, 0, 0),
      new Vector3(5.5, 0, 0),
      new Vector3(0, 0, -5.5),
      new Vector3(0, 0, 5.5),
    ];

    const brazierLights: PointLight[] = [];

    brazierPositions.forEach((pos, idx) => {
      // Iron pedestal
      const pedestal = MeshBuilder.CreateCylinder(
        `brazierPedestal_${idx}`,
        { diameterTop: 0.6, diameterBottom: 0.9, height: 1.5, tessellation: 8 },
        scene
      );
      pedestal.position.set(pos.x, 0.75, pos.z);
      pedestal.material = ironMat;
      pedestal.isPickable = true;
      shadowGenerator.addShadowCaster(pedestal);
      new PhysicsAggregate(
        pedestal,
        PhysicsShapeType.CYLINDER,
        { mass: 0, friction: 0.8, restitution: 0.1 },
        scene
      );

      // Iron fire bowl
      const bowl = MeshBuilder.CreateCylinder(
        `brazierBowl_${idx}`,
        { diameterTop: 1.3, diameterBottom: 0.65, height: 0.45, tessellation: 10 },
        scene
      );
      bowl.position.set(pos.x, 1.65, pos.z);
      bowl.material = ironMat;
      bowl.isPickable = false;

      // Glowing embers
      const embers = MeshBuilder.CreateSphere(
        `brazierEmbers_${idx}`,
        { diameter: 0.85, segments: 6 },
        scene
      );
      embers.position.set(pos.x, 1.85, pos.z);
      embers.material = emberMat;
      embers.isPickable = false;

      // Warm amber fire point light cutting through the grey mist
      const fireLight = new PointLight(
        `brazierLight_${idx}`,
        new Vector3(pos.x, 2.3, pos.z),
        scene
      );
      fireLight.diffuse = new Color3(1.0, 0.62, 0.22);
      fireLight.specular = new Color3(1.0, 0.7, 0.3);
      fireLight.intensity = 0.82;
      fireLight.range = 11.0;

      brazierLights.push(fireLight);
    });

    // 7. 4 Corner Summoning Sigil Spawn Pads
    const sigilMat = new StandardMaterial('summonSigilMat', scene);
    sigilMat.diffuseColor = new Color3(0.2, 0.08, 0.08);
    sigilMat.emissiveColor = new Color3(0.65, 0.12, 0.08);

    const spawnPoints = [
      new Vector3(-16, 1.1, -16),
      new Vector3(16, 1.1, -16),
      new Vector3(-16, 1.1, 16),
      new Vector3(16, 1.1, 16),
    ];

    spawnPoints.forEach((pt, idx) => {
      const sigil = MeshBuilder.CreateCylinder(
        `spawnSigil_${idx}`,
        { diameter: 2.8, height: 0.05, tessellation: 12 },
        scene
      );
      sigil.position.set(pt.x, 0.03, pt.z);
      sigil.material = sigilMat;
      sigil.isPickable = false;
    });

    return { spawnPoints, shadowGenerator, brazierLights };
  }
}
