import {
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

export interface ArenaData {
  spawnPoints: Vector3[];
  shadowGenerator: ShadowGenerator;
}

export class ArenaBuilder {
  static build(scene: Scene): ArenaData {
    scene.clearColor = new Color4(0.06, 0.07, 0.09, 1);
    scene.collisionsEnabled = true;

    const hemiLight = new HemisphericLight(
      'hemiLight',
      new Vector3(0, 1, 0),
      scene
    );
    hemiLight.intensity = 0.55;
    hemiLight.groundColor = new Color3(0.12, 0.14, 0.18);

    const dirLight = new DirectionalLight(
      'dirLight',
      new Vector3(-0.5, -1, -0.4).normalize(),
      scene
    );
    dirLight.position = new Vector3(15, 28, 15);
    dirLight.intensity = 0.85;

    const shadowGenerator = new ShadowGenerator(1024, dirLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 16;

    // Materials
    const floorMat = new StandardMaterial('floorMat', scene);
    floorMat.diffuseColor = new Color3(0.16, 0.18, 0.22);
    floorMat.specularColor = new Color3(0.08, 0.08, 0.1);

    const gridTrimMat = new StandardMaterial('gridTrimMat', scene);
    gridTrimMat.diffuseColor = new Color3(0.24, 0.27, 0.33);
    gridTrimMat.emissiveColor = new Color3(0.04, 0.08, 0.12);

    const wallMat = new StandardMaterial('wallMat', scene);
    wallMat.diffuseColor = new Color3(0.22, 0.24, 0.28);
    wallMat.specularColor = new Color3(0.1, 0.1, 0.1);

    const coverMat = new StandardMaterial('coverMat', scene);
    coverMat.diffuseColor = new Color3(0.32, 0.26, 0.2);
    coverMat.specularColor = new Color3(0.12, 0.12, 0.12);

    // 40m x 40m Floor
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

    // Subtle floor lane strips for strong motion reference
    for (let offset = -12; offset <= 12; offset += 8) {
      const stripX = MeshBuilder.CreateBox(
        `floorStripX_${offset}`,
        { width: arenaSize - 2, height: 0.02, depth: 0.25 },
        scene
      );
      stripX.position.set(0, 0.01, offset);
      stripX.material = gridTrimMat;
      stripX.isPickable = false;

      const stripZ = MeshBuilder.CreateBox(
        `floorStripZ_${offset}`,
        { width: 0.25, height: 0.02, depth: arenaSize - 2 },
        scene
      );
      stripZ.position.set(offset, 0.01, 0);
      stripZ.material = gridTrimMat;
      stripZ.isPickable = false;
    }

    // 4m Perimeter Walls
    const wallHeight = 4.5;
    const wallThickness = 1;
    const half = arenaSize / 2;
    const wallConfigs = [
      {
        name: 'wallNorth',
        w: arenaSize + wallThickness * 2,
        d: wallThickness,
        x: 0,
        z: half + wallThickness / 2,
      },
      {
        name: 'wallSouth',
        w: arenaSize + wallThickness * 2,
        d: wallThickness,
        x: 0,
        z: -(half + wallThickness / 2),
      },
      {
        name: 'wallEast',
        w: wallThickness,
        d: arenaSize,
        x: half + wallThickness / 2,
        z: 0,
      },
      {
        name: 'wallWest',
        w: wallThickness,
        d: arenaSize,
        x: -(half + wallThickness / 2),
        z: 0,
      },
    ];

    for (const cfg of wallConfigs) {
      const wall = MeshBuilder.CreateBox(
        cfg.name,
        { width: cfg.w, height: wallHeight, depth: cfg.d },
        scene
      );
      wall.position.set(cfg.x, wallHeight / 2, cfg.z);
      wall.material = wallMat;
      wall.checkCollisions = true;
      wall.receiveShadows = true;
      wall.isPickable = true;
      new PhysicsAggregate(
        wall,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.5, restitution: 0.2 },
        scene
      );
    }

    // Symmetrical Interior Cover Pillars & Heavy Crates
    const obstacles = [
      { x: -8, z: -8, w: 2.6, h: 2.6, d: 2.6 },
      { x: 8, z: -8, w: 2.6, h: 2.6, d: 2.6 },
      { x: -8, z: 8, w: 2.6, h: 2.6, d: 2.6 },
      { x: 8, z: 8, w: 2.6, h: 2.6, d: 2.6 },
      { x: 0, z: -12, w: 4.2, h: 1.8, d: 1.6 },
      { x: 0, z: 12, w: 4.2, h: 1.8, d: 1.6 },
      { x: -12, z: 0, w: 1.6, h: 1.8, d: 4.2 },
      { x: 12, z: 0, w: 1.6, h: 1.8, d: 4.2 },
    ];

    obstacles.forEach((obs, idx) => {
      const box = MeshBuilder.CreateBox(
        `coverObstacle_${idx}`,
        { width: obs.w, height: obs.h, depth: obs.d },
        scene
      );
      box.position.set(obs.x, obs.h / 2, obs.z);
      box.material = coverMat;
      box.checkCollisions = true;
      box.receiveShadows = true;
      box.isPickable = true;
      shadowGenerator.addShadowCaster(box);
      new PhysicsAggregate(
        box,
        PhysicsShapeType.BOX,
        { mass: 0, friction: 0.6, restitution: 0.2 },
        scene
      );
    });

    // 4 Corner Perimeter Spawn Points + Visual Floor Pads
    const spawnPadMat = new StandardMaterial('spawnPadMat', scene);
    spawnPadMat.diffuseColor = new Color3(0.6, 0.15, 0.1);
    spawnPadMat.emissiveColor = new Color3(0.35, 0.08, 0.05);

    const spawnPoints = [
      new Vector3(-16, 1.1, -16),
      new Vector3(16, 1.1, -16),
      new Vector3(-16, 1.1, 16),
      new Vector3(16, 1.1, 16),
    ];

    spawnPoints.forEach((pt, idx) => {
      const pad = MeshBuilder.CreateCylinder(
        `spawnPad_${idx}`,
        { diameter: 2.4, height: 0.06, tessellation: 20 },
        scene
      );
      pad.position.set(pt.x, 0.03, pt.z);
      pad.material = spawnPadMat;
      pad.isPickable = false;
    });

    return { spawnPoints, shadowGenerator };
  }
}
