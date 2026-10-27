import {
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  Mesh,
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
import {
  ArenaLayoutGenerator,
  type ArenaLayout,
} from '../core/ArenaLayoutGenerator';

export interface ArenaData {
  shadowGenerator: ShadowGenerator;
  brazierLights: PointLight[];
  builder: ArenaBuilder;
  spawnPoints: Vector3[];
}

export class ArenaBuilder {
  private readonly scene: Scene;
  public readonly shadowGenerator: ShadowGenerator;
  public brazierLights: PointLight[] = [];

  private readonly dynamicMeshes: Mesh[] = [];
  private readonly dynamicAggregates: PhysicsAggregate[] = [];

  // Cached shared materials (never disposed on dynamic layout rebuilds)
  private floorMat!: StandardMaterial;
  private wallMat!: StandardMaterial;
  private cryptMat!: StandardMaterial;
  private ironMat!: StandardMaterial;
  private emberMat!: StandardMaterial;

  constructor(scene: Scene) {
    this.scene = scene;

    // 1. Atmosphere: Gloomy Overcast Daylight & Heavy Fog (Quake 1 / Dark Forces Vibe)
    const fogAshGrey = new Color3(0.24, 0.25, 0.27);
    scene.clearColor = new Color4(0.24, 0.25, 0.27, 1.0);
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.054;
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
    hemiLight.groundColor = new Color3(0.2, 0.19, 0.18);

    // Filtered high-angle daylight casting soft shadows
    const dirLight = new DirectionalLight(
      'diffuseSun',
      new Vector3(-0.4, -1, -0.3).normalize(),
      scene
    );
    dirLight.position = new Vector3(35, 45, 30);
    dirLight.intensity = 0.45;
    dirLight.diffuse = new Color3(0.75, 0.76, 0.78);

    this.shadowGenerator = new ShadowGenerator(1024, dirLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 16;

    this.initMaterials();
    this.buildStaticPerimeter();
  }

  private initMaterials(): void {
    const base = (import.meta.env?.BASE_URL ?? '/').replace(/\/+$/, '');

    const floorTexture = new Texture(
      `${base}/assets/textures/stone_floor.png`,
      this.scene,
      false,
      true,
      Texture.NEAREST_SAMPLINGMODE
    );
    floorTexture.uScale = 40;
    floorTexture.vScale = 40;
    this.floorMat = new StandardMaterial('retroFloorMat', this.scene);
    this.floorMat.diffuseTexture = floorTexture;
    this.floorMat.specularColor = new Color3(0.01, 0.01, 0.01);

    const wallTexture = new Texture(
      `${base}/assets/textures/dungeon_wall.png`,
      this.scene,
      false,
      true,
      Texture.NEAREST_SAMPLINGMODE
    );
    wallTexture.uScale = 8;
    wallTexture.vScale = 2.5;
    this.wallMat = new StandardMaterial('retroWallMat', this.scene);
    this.wallMat.diffuseTexture = wallTexture;
    this.wallMat.specularColor = new Color3(0.01, 0.01, 0.01);

    const cryptTexture = new Texture(
      `${base}/assets/textures/crypt_stone.png`,
      this.scene,
      false,
      true,
      Texture.NEAREST_SAMPLINGMODE
    );
    cryptTexture.uScale = 3;
    cryptTexture.vScale = 3;
    this.cryptMat = new StandardMaterial('retroCryptMat', this.scene);
    this.cryptMat.diffuseTexture = cryptTexture;
    this.cryptMat.specularColor = new Color3(0.01, 0.01, 0.01);

    const ironTexture = new Texture(
      `${base}/assets/textures/rusted_iron.png`,
      this.scene,
      false,
      true,
      Texture.NEAREST_SAMPLINGMODE
    );
    ironTexture.uScale = 2;
    ironTexture.vScale = 2;
    this.ironMat = new StandardMaterial('retroIronMat', this.scene);
    this.ironMat.diffuseTexture = ironTexture;
    this.ironMat.specularColor = new Color3(0.12, 0.1, 0.08);

    this.emberMat = new StandardMaterial('brazierEmberMat', this.scene);
    this.emberMat.diffuseColor = new Color3(1.0, 0.55, 0.1);
    this.emberMat.emissiveColor = new Color3(1.0, 0.45, 0.05);
  }

  private buildStaticPerimeter(): void {
    const arenaSize = 100;
    const floor = MeshBuilder.CreateBox(
      'arenaFloor',
      { width: arenaSize, height: 1, depth: arenaSize },
      this.scene
    );
    floor.position.y = -0.5;
    floor.material = this.floorMat;
    floor.receiveShadows = true;
    floor.checkCollisions = true;
    floor.isPickable = true;
    new PhysicsAggregate(
      floor,
      PhysicsShapeType.BOX,
      { mass: 0, friction: 0.7, restitution: 0.15 },
      this.scene
    );

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
      const wall = MeshBuilder.CreateBox(
        cfg.name,
        { width: cfg.w, height: parapetHeight, depth: cfg.d },
        this.scene
      );
      wall.position.set(cfg.x, parapetHeight / 2, cfg.z);
      wall.material = this.wallMat;
      wall.checkCollisions = true;
      wall.receiveShadows = true;
      wall.isPickable = true;
      this.shadowGenerator.addShadowCaster(wall);

      new PhysicsAggregate(
        wall,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.6, restitution: 0.2 },
        this.scene
      );

      const invisibleCeilingWall = MeshBuilder.CreateBox(
        `${cfg.name}_invisibleBound`,
        { width: cfg.w, height: 6.0, depth: cfg.d },
        this.scene
      );
      invisibleCeilingWall.position.set(cfg.x, 3.0 + parapetHeight, cfg.z);
      invisibleCeilingWall.isVisible = false;
      invisibleCeilingWall.isPickable = false;
      invisibleCeilingWall.checkCollisions = true;
      new PhysicsAggregate(
        invisibleCeilingWall,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.4, restitution: 0.1 },
        this.scene
      );

      const spikeCount = 36;
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
          this.scene
        );
        if (cfg.isAlongX) {
          spike.position.set(i * step, parapetHeight + spikeH / 2, cfg.z);
        } else {
          spike.position.set(cfg.x, parapetHeight + spikeH / 2, i * step);
        }
        spike.rotation.set(tiltX, 0, tiltZ);
        spike.material = this.ironMat;
        spike.isPickable = false;
      }
    }
  }

  public rebuildDynamicLayout(layout: ArenaLayout): PointLight[] {
    // 1. Dispose previous dynamic physics aggregates
    for (const agg of this.dynamicAggregates) {
      agg.dispose();
    }
    this.dynamicAggregates.length = 0;

    // 2. Dispose previous brazier lights
    for (const light of this.brazierLights) {
      light.dispose();
    }
    this.brazierLights = [];

    // 3. Dispose previous dynamic meshes
    for (const mesh of this.dynamicMeshes) {
      mesh.dispose(false, true);
    }
    this.dynamicMeshes.length = 0;

    // 4. Build Megaliths
    layout.megaliths.forEach((obs, idx) => {
      const pillar = MeshBuilder.CreateBox(
        `gothicMegalith_${idx}`,
        { width: obs.width, height: obs.height, depth: obs.depth },
        this.scene
      );
      pillar.position.set(obs.x, obs.height / 2, obs.z);
      pillar.rotation.y = obs.rotationY;
      pillar.material = this.cryptMat;
      pillar.checkCollisions = true;
      pillar.receiveShadows = true;
      pillar.isPickable = true;
      this.shadowGenerator.addShadowCaster(pillar);
      const pillarAgg = new PhysicsAggregate(
        pillar,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.6, restitution: 0.2 },
        this.scene
      );
      this.dynamicMeshes.push(pillar);
      this.dynamicAggregates.push(pillarAgg);

      // Jagged chipped stone cap
      const cap = MeshBuilder.CreateCylinder(
        `megalithCap_${idx}`,
        {
          diameterTop: obs.width * 0.78,
          diameterBottom: obs.width * 1.04,
          height: 0.8,
          tessellation: 5,
        },
        this.scene
      );
      cap.position.set(obs.x + 0.06, obs.height + 0.38, obs.z - 0.05);
      cap.rotation.set(0.08, obs.capAngle ?? idx * 0.9, -0.06);
      cap.material = this.cryptMat;
      cap.isPickable = true;
      this.shadowGenerator.addShadowCaster(cap);
      this.dynamicMeshes.push(cap);

      // Fallen weathered stone rubble block at base
      const rubbleOffset = obs.rubbleOffset ?? {
        x: idx % 2 === 0 ? 2.2 : -2.2,
        z: idx > 1 ? 2.1 : -2.1,
      };
      const rubble = MeshBuilder.CreateBox(
        `megalithRubble_${idx}`,
        { width: 1.2, height: 0.55, depth: 1.0 },
        this.scene
      );
      rubble.position.set(
        obs.x + rubbleOffset.x,
        0.28,
        obs.z + rubbleOffset.z
      );
      rubble.rotation.set(0.14, idx * 1.3, -0.18);
      rubble.material = this.cryptMat;
      rubble.checkCollisions = true;
      rubble.receiveShadows = true;
      rubble.isPickable = true;
      this.shadowGenerator.addShadowCaster(rubble);
      const rubbleAgg = new PhysicsAggregate(
        rubble,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.7, restitution: 0.1 },
        this.scene
      );
      this.dynamicMeshes.push(rubble);
      this.dynamicAggregates.push(rubbleAgg);

      // Skewed rusted iron reinforcement bands
      for (const bandY of [obs.height * 0.35, obs.height * 0.75]) {
        const band = MeshBuilder.CreateBox(
          `pillarBand_${idx}_${bandY.toFixed(1)}`,
          {
            width: obs.width + 0.14,
            height: 0.26,
            depth: obs.depth + 0.14,
          },
          this.scene
        );
        band.position.set(obs.x, bandY, obs.z);
        band.rotation.set(0, obs.rotationY, idx % 2 === 0 ? 0.03 : -0.03);
        band.material = this.ironMat;
        band.isPickable = false;
        this.dynamicMeshes.push(band);
      }
    });

    // 5. Build Crypt Barricades
    layout.barricades.forEach((obs, idx) => {
      const slab = MeshBuilder.CreateBox(
        `cryptBarricade_${idx}`,
        { width: obs.width, height: obs.height, depth: obs.depth },
        this.scene
      );
      slab.position.set(obs.x, obs.height / 2, obs.z);
      slab.rotation.y = obs.rotationY;
      slab.material = this.wallMat;
      slab.checkCollisions = true;
      slab.receiveShadows = true;
      slab.isPickable = true;
      this.shadowGenerator.addShadowCaster(slab);
      const slabAgg = new PhysicsAggregate(
        slab,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.6, restitution: 0.2 },
        this.scene
      );
      this.dynamicMeshes.push(slab);
      this.dynamicAggregates.push(slabAgg);

      // Iron top trim
      const ironCap = MeshBuilder.CreateBox(
        `barricadeCap_${idx}`,
        {
          width: obs.width + 0.08,
          height: 0.14,
          depth: obs.depth + 0.08,
        },
        this.scene
      );
      ironCap.position.set(obs.x, obs.height + 0.07, obs.z);
      ironCap.rotation.set(0.015, obs.rotationY, idx % 2 === 0 ? 0.02 : -0.02);
      ironCap.material = this.ironMat;
      ironCap.isPickable = false;
      this.dynamicMeshes.push(ironCap);

      // Fallen stepping stone fragment
      const frag = MeshBuilder.CreateBox(
        `barricadeFrag_${idx}`,
        { width: 0.8, height: 0.4, depth: 0.7 },
        this.scene
      );
      frag.position.set(
        obs.x + (obs.width > obs.depth ? obs.width / 2 + 0.5 : 0),
        0.2,
        obs.z + (obs.depth > obs.width ? obs.depth / 2 + 0.5 : 0)
      );
      frag.rotation.set(-0.1, idx * 0.8, 0.15);
      frag.material = this.wallMat;
      frag.checkCollisions = true;
      frag.isPickable = true;
      const fragAgg = new PhysicsAggregate(
        frag,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.7 },
        this.scene
      );
      this.dynamicMeshes.push(frag);
      this.dynamicAggregates.push(fragAgg);
    });

    // 6. Build Braziers
    layout.braziers.forEach((pos, idx) => {
      // 3 tripod legs
      const legAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
      legAngles.forEach((ang, legIdx) => {
        const leg = MeshBuilder.CreateCylinder(
          `brazierLeg_${idx}_${legIdx}`,
          { diameter: 0.08, height: 1.6, tessellation: 5 },
          this.scene
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
        leg.material = this.ironMat;
        leg.isPickable = true;
        this.shadowGenerator.addShadowCaster(leg);
        this.dynamicMeshes.push(leg);
      });

      // Central pedestal column
      const pedestal = MeshBuilder.CreateCylinder(
        `brazierPedestal_${idx}`,
        {
          diameterTop: 0.45,
          diameterBottom: 0.7,
          height: 1.4,
          tessellation: 6,
        },
        this.scene
      );
      pedestal.position.set(pos.x, 0.7, pos.z);
      pedestal.material = this.ironMat;
      pedestal.checkCollisions = true;
      pedestal.isPickable = true;
      this.shadowGenerator.addShadowCaster(pedestal);
      const pedAgg = new PhysicsAggregate(
        pedestal,
        PhysicsShapeType.CYLINDER,
        { mass: 0, friction: 0.8, restitution: 0.1 },
        this.scene
      );
      this.dynamicMeshes.push(pedestal);
      this.dynamicAggregates.push(pedAgg);

      // Fire bowl
      const bowl = MeshBuilder.CreateCylinder(
        `brazierBowl_${idx}`,
        {
          diameterTop: 1.35,
          diameterBottom: 0.6,
          height: 0.48,
          tessellation: 7,
        },
        this.scene
      );
      bowl.position.set(pos.x, 1.62, pos.z);
      bowl.rotation.y = idx * 0.4;
      bowl.material = this.ironMat;
      bowl.checkCollisions = true;
      bowl.isPickable = true;
      this.shadowGenerator.addShadowCaster(bowl);
      const bowlAgg = new PhysicsAggregate(
        bowl,
        PhysicsShapeType.CYLINDER,
        { mass: 0, friction: 0.8, restitution: 0.1 },
        this.scene
      );
      this.dynamicMeshes.push(bowl);
      this.dynamicAggregates.push(bowlAgg);

      // Embers
      const embers = MeshBuilder.CreateSphere(
        `brazierEmbers_${idx}`,
        { diameter: 0.85, segments: 6 },
        this.scene
      );
      embers.position.set(pos.x, 1.82, pos.z);
      embers.material = this.emberMat;
      embers.isPickable = false;
      this.dynamicMeshes.push(embers);

      // PointLight
      const fireLight = new PointLight(
        `brazierLight_${idx}`,
        new Vector3(pos.x, 2.3, pos.z),
        this.scene
      );
      fireLight.diffuse = new Color3(1.0, 0.62, 0.22);
      fireLight.specular = new Color3(1.0, 0.7, 0.3);
      fireLight.intensity = 0.85;
      fireLight.range = 18.0;

      this.brazierLights.push(fireLight);
    });

    return this.brazierLights;
  }

  static build(scene: Scene, layout?: ArenaLayout): ArenaData {
    const builder = new ArenaBuilder(scene);
    const activeLayout = layout ?? ArenaLayoutGenerator.generate(1);
    const brazierLights = builder.rebuildDynamicLayout(activeLayout);

    // Fallback spawn points for legacy callers
    const spawnPoints = [
      new Vector3(-42, 1.1, -42),
      new Vector3(42, 1.1, -42),
      new Vector3(-42, 1.1, 42),
      new Vector3(42, 1.1, 42),
    ];

    return {
      shadowGenerator: builder.shadowGenerator,
      brazierLights,
      builder,
      spawnPoints,
    };
  }
}
