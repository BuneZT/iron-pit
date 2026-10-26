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
    const base = (import.meta.env?.BASE_URL ?? '/').replace(/\/+$/, '');
    const floorTexture = new Texture(
      `${base}/assets/textures/stone_floor.png`,
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
      `${base}/assets/textures/dungeon_wall.png`,
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
      `${base}/assets/textures/crypt_stone.png`,
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
      `${base}/assets/textures/rusted_iron.png`,
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

      // Gothic rusted iron spikes along parapet top (with crooked tilts & variable heights)
      const spikeCount = 14;
      const step = arenaSize / spikeCount;
      for (let i = -spikeCount / 2; i <= spikeCount / 2; i++) {
        const tiltZ = Math.sin(i * 3.7 + cfg.x * 2.1) * 0.18;
        const tiltX = Math.cos(i * 2.9 + cfg.z * 1.7) * 0.18;
        const spikeH = 0.65 + Math.abs(Math.sin(i * 1.9 + cfg.x)) * 0.32;

        const spike = MeshBuilder.CreateCylinder(
          `${cfg.name}_spike_${i}`,
          {
            diameterTop: 0.02,
            diameterBottom: 0.12,
            height: spikeH,
            tessellation: 5,
          },
          scene
        );
        if (cfg.isAlongX) {
          spike.position.set(i * step, parapetHeight + spikeH / 2, cfg.z);
        } else {
          spike.position.set(cfg.x, parapetHeight + spikeH / 2, i * step);
        }
        spike.rotation.set(tiltX, 0, tiltZ);
        spike.material = ironMat;
        spike.isPickable = false;
      }
    }

    // 5. Gothic Monoliths & Crypt Barricades (with weathered chips, uneven caps & fallen rubble)
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

      // Jagged chipped stone cap on top of megalith (slanted, irregular polygon)
      const cap = MeshBuilder.CreateCylinder(
        `megalithCap_${idx}`,
        {
          diameterTop: obs.w * 0.78,
          diameterBottom: obs.w * 1.04,
          height: 0.65,
          tessellation: 5,
        },
        scene
      );
      cap.position.set(obs.x + 0.06, obs.h + 0.3, obs.z - 0.05);
      cap.rotation.set(0.08, idx * 0.9, -0.06);
      cap.material = cryptMat;
      cap.isPickable = true;
      shadowGenerator.addShadowCaster(cap);

      // Fallen weathered stone rubble block at base
      const rubble = MeshBuilder.CreateBox(
        `megalithRubble_${idx}`,
        { width: 0.95, height: 0.48, depth: 0.8 },
        scene
      );
      rubble.position.set(
        obs.x + (idx % 2 === 0 ? 1.7 : -1.7),
        0.24,
        obs.z + (idx > 1 ? 1.6 : -1.6)
      );
      rubble.rotation.set(0.14, idx * 1.3, -0.18);
      rubble.material = cryptMat;
      rubble.checkCollisions = true;
      rubble.receiveShadows = true;
      rubble.isPickable = true;
      shadowGenerator.addShadowCaster(rubble);
      new PhysicsAggregate(
        rubble,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.7, restitution: 0.1 },
        scene
      );

      // Rusted iron reinforcement bands clamped around the stone pillar (slightly skewed)
      for (const bandY of [obs.h * 0.35, obs.h * 0.75]) {
        const band = MeshBuilder.CreateBox(
          `pillarBand_${idx}_${bandY.toFixed(1)}`,
          { width: obs.w + 0.12, height: 0.22, depth: obs.d + 0.12 },
          scene
        );
        band.position.set(obs.x, bandY, obs.z);
        band.rotation.set(0, 0, (idx % 2 === 0 ? 0.03 : -0.03));
        band.material = ironMat;
        band.isPickable = false;
      }
    });

    // Heavy crypt slab barricades with chipped corners & fallen fragments
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

      // Iron top trim (slightly offset & tilted)
      const ironCap = MeshBuilder.CreateBox(
        `barricadeCap_${idx}`,
        { width: obs.w + 0.08, height: 0.14, depth: obs.d + 0.08 },
        scene
      );
      ironCap.position.set(obs.x, obs.h + 0.07, obs.z);
      ironCap.rotation.set(0.015, 0, (idx % 2 === 0 ? 0.02 : -0.02));
      ironCap.material = ironMat;
      ironCap.isPickable = false;

      // Small fallen stone block at barricade end
      const frag = MeshBuilder.CreateBox(
        `barricadeFrag_${idx}`,
        { width: 0.7, height: 0.35, depth: 0.6 },
        scene
      );
      frag.position.set(
        obs.x + (obs.w > obs.d ? obs.w / 2 + 0.4 : 0),
        0.18,
        obs.z + (obs.d > obs.w ? obs.d / 2 + 0.4 : 0)
      );
      frag.rotation.set(-0.1, idx * 0.8, 0.15);
      frag.material = wallMat;
      frag.checkCollisions = true;
      frag.isPickable = true;
      new PhysicsAggregate(
        frag,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.7 },
        scene
      );
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
      // 3-legged crooked iron tripod pedestal
      const legAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
      legAngles.forEach((ang, legIdx) => {
        const leg = MeshBuilder.CreateCylinder(
          `brazierLeg_${idx}_${legIdx}`,
          { diameter: 0.08, height: 1.6, tessellation: 5 },
          scene
        );
        const legDist = 0.35;
        leg.position.set(
          pos.x + Math.cos(ang) * legDist,
          0.75,
          pos.z + Math.sin(ang) * legDist
        );
        leg.rotation.set(
          Math.sin(ang) * 0.22,
          0,
          -Math.cos(ang) * 0.22
        );
        leg.material = ironMat;
        leg.isPickable = true;
        shadowGenerator.addShadowCaster(leg);
      });

      // Central iron support column
      const pedestal = MeshBuilder.CreateCylinder(
        `brazierPedestal_${idx}`,
        { diameterTop: 0.45, diameterBottom: 0.7, height: 1.4, tessellation: 6 },
        scene
      );
      pedestal.position.set(pos.x, 0.7, pos.z);
      pedestal.material = ironMat;
      pedestal.isPickable = true;
      shadowGenerator.addShadowCaster(pedestal);
      new PhysicsAggregate(
        pedestal,
        PhysicsShapeType.CYLINDER,
        { mass: 0, friction: 0.8, restitution: 0.1 },
        scene
      );

      // Jagged iron fire bowl (faceted 7-gon)
      const bowl = MeshBuilder.CreateCylinder(
        `brazierBowl_${idx}`,
        { diameterTop: 1.35, diameterBottom: 0.6, height: 0.48, tessellation: 7 },
        scene
      );
      bowl.position.set(pos.x, 1.62, pos.z);
      bowl.rotation.y = idx * 0.4;
      bowl.material = ironMat;
      bowl.isPickable = false;

      // Glowing embers
      const embers = MeshBuilder.CreateSphere(
        `brazierEmbers_${idx}`,
        { diameter: 0.85, segments: 6 },
        scene
      );
      embers.position.set(pos.x, 1.82, pos.z);
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
