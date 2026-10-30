/**
 * FITCALC - Drive Mad 3D Voxel Jeep Truck Game Engine
 * Faithfully styled after the original Drive Mad (Fancade)
 * - Yellow 6-Wheeled Off-Road Truck (Tandem Rear Axles)
 * - Pinkish Carved Cliff Platforms with Grass Tufts
 * - Curved Wooden Planks Suspension Bridge with Broken Gaps from Level 3+
 * - Blue Mountain Pyramids, Sky Blue Background, Water Ocean
 * - Perfectly Stable Ground Spawn (No Inversion/Flipping on Start!)
 * - Arrow Keys (←/→) Driving & Mid-Air Pitch Balance
 * - Enter Key for Next Level / Retry
 */
(function () {
  'use strict';

  // Sound System (Web Audio API Synthesizer)
  const SoundFX = (function () {
    let ctx = null;
    let isMuted = false;

    function getContext() {
      if (!ctx && (window.AudioContext || window.webkitAudioContext)) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
      return ctx;
    }

    return {
      toggleMute: function () {
        isMuted = !isMuted;
        return isMuted;
      },
      isMuted: function () {
        return isMuted;
      },
      playEngine: function (speed) {
        if (isMuted) return;
        const c = getContext();
        if (!c) return;
        try {
          const osc = c.createOscillator();
          const gain = c.createGain();
          osc.type = 'sawtooth';
          const freq = 60 + Math.min(Math.abs(speed) * 18, 140);
          osc.frequency.setValueAtTime(freq, c.currentTime);
          gain.gain.setValueAtTime(0.035, c.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start();
          osc.stop(c.currentTime + 0.1);
        } catch (e) {}
      },
      playJump: function () {
        if (isMuted) return;
        const c = getContext();
        if (!c) return;
        try {
          const osc = c.createOscillator();
          const gain = c.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(160, c.currentTime);
          osc.frequency.exponentialRampToValueAtTime(320, c.currentTime + 0.18);
          gain.gain.setValueAtTime(0.1, c.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start();
          osc.stop(c.currentTime + 0.18);
        } catch (e) {}
      },
      playCrash: function () {
        if (isMuted) return;
        const c = getContext();
        if (!c) return;
        try {
          const osc = c.createOscillator();
          const gain = c.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(140, c.currentTime);
          osc.frequency.exponentialRampToValueAtTime(25, c.currentTime + 0.35);
          gain.gain.setValueAtTime(0.25, c.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start();
          osc.stop(c.currentTime + 0.35);
        } catch (e) {}
      },
      playWin: function () {
        if (isMuted) return;
        const c = getContext();
        if (!c) return;
        try {
          const notes = [523.25, 659.25, 783.99, 1046.5];
          notes.forEach((freq, idx) => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, c.currentTime + idx * 0.09);
            gain.gain.setValueAtTime(0.12, c.currentTime + idx * 0.09);
            gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + idx * 0.09 + 0.3);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(c.currentTime + idx * 0.09);
            osc.stop(c.currentTime + idx * 0.09 + 0.3);
          });
        } catch (e) {}
      }
    };
  })();

  // 10 Levels: Level 1-2 smooth, Level 3+ Broken Bridge Gaps requiring speed!
  const LEVELS = [
    {
      id: 1,
      name: '기초 주행 (First Drive)',
      description: '오른쪽 방향키(→)를 눌러 부드럽게 주행을 시작하세요!',
      startX: 0,
      finishX: 28,
      segments: [
        { type: 'platform', x1: -5, x2: 8, y: 0 },
        { type: 'bridge', x1: 8, x2: 24, y1: 0, y2: 0, curved: true },
        { type: 'platform', x1: 24, x2: 36, y: 0 }
      ]
    },
    {
      id: 2,
      name: '아치형 다리 (Arched Bridge)',
      description: '부드러운 곡선의 목재 아치 다리를 건너보세요.',
      startX: 0,
      finishX: 32,
      segments: [
        { type: 'platform', x1: -5, x2: 8, y: 0 },
        { type: 'bridge', x1: 8, x2: 28, y1: 0, y2: 0, archHeight: 1.6 },
        { type: 'platform', x1: 28, x2: 40, y: 0 }
      ]
    },
    {
      id: 3,
      name: '끊어진 다리 I (Broken Bridge I)',
      description: '⚠️ 다리가 끊어져 있습니다! 오른쪽 키를 꾹 눌러 빠르게 가속해 뛰어넘으세요!',
      startX: 0,
      finishX: 34,
      segments: [
        { type: 'platform', x1: -5, x2: 8, y: 0 },
        { type: 'bridge', x1: 8, x2: 17, y1: 0, y2: 0.2 },
        // GAP: 17 to 22.5 (5.5 units gap)
        { type: 'bridge', x1: 22.5, x2: 30, y1: -0.1, y2: 0 },
        { type: 'platform', x1: 30, x2: 42, y: 0 }
      ]
    },
    {
      id: 4,
      name: '도약 갭 점프 (The Speed Gap)',
      description: '더 넓어진 끊어진 구간! 충분한 전진 속도를 내야 안전하게 착지할 수 있습니다.',
      startX: 0,
      finishX: 36,
      segments: [
        { type: 'platform', x1: -5, x2: 9, y: 0 },
        { type: 'bridge', x1: 9, x2: 18, y1: 0, y2: 0.6 },
        // GAP: 18 to 24.8 (6.8 units gap)
        { type: 'bridge', x1: 24.8, x2: 32, y1: 0.1, y2: 0 },
        { type: 'platform', x1: 32, x2: 44, y: 0 }
      ]
    },
    {
      id: 5,
      name: '도약대 점프 (Ramp Leap)',
      description: '상승 경사 도약대에서 점프하여 바다 건너 다리에 착지하세요!',
      startX: 0,
      finishX: 38,
      segments: [
        { type: 'platform', x1: -5, x2: 8, y: 0 },
        { type: 'bridge', x1: 8, x2: 18, y1: 0, y2: 1.4 }, // Ramp Up
        // GAP: 18 to 26 (8.0 units gap)
        { type: 'bridge', x1: 26, x2: 34, y1: 0.2, y2: 0 },
        { type: 'platform', x1: 34, x2: 46, y: 0 }
      ]
    },
    {
      id: 6,
      name: '더블 갭 챌린지 (Double Broken Bridge)',
      description: '연속 2개의 끊어진 다리! 중간 다리에서 균형을 잡고 다시 도약하세요.',
      startX: 0,
      finishX: 42,
      segments: [
        { type: 'platform', x1: -5, x2: 7, y: 0 },
        { type: 'bridge', x1: 7, x2: 15, y1: 0, y2: 0.2 },
        // GAP 1: 15 to 20.5
        { type: 'bridge', x1: 20.5, x2: 26, y1: 0.1, y2: 0.3 }, // Middle Island
        // GAP 2: 26 to 31.5
        { type: 'bridge', x1: 31.5, x2: 38, y1: 0, y2: 0 },
        { type: 'platform', x1: 38, x2: 50, y: 0 }
      ]
    },
    {
      id: 7,
      name: '절벽 도약 낙하 (High Cliff Drop)',
      description: '높은 절벽 다리에서 뛰어내릴 때 공중에서 수평을 맞춰 착지하세요.',
      startX: 0,
      finishX: 38,
      segments: [
        { type: 'platform', x1: -5, x2: 8, y: 2.8 },
        { type: 'bridge', x1: 8, x2: 16, y1: 2.8, y2: 3.1 },
        // GAP DROP: 16 to 23.5 (Drops from 3.1 to 0)
        { type: 'bridge', x1: 23.5, x2: 33, y1: 0.1, y2: 0 },
        { type: 'platform', x1: 33, x2: 46, y: 0 }
      ]
    },
    {
      id: 8,
      name: '스피드 롤러코스터 (Roller Drop Leap)',
      description: '내리막으로 가속력을 얻은 후 끊어진 협곡을 뛰어넘으세요!',
      startX: 0,
      finishX: 42,
      segments: [
        { type: 'platform', x1: -5, x2: 7, y: 0 },
        { type: 'bridge', x1: 7, x2: 14, y1: 0, y2: -0.8 }, // Dip Down
        { type: 'bridge', x1: 14, x2: 20, y1: -0.8, y2: 1.2 }, // Ramp Up
        // GAP: 20 to 28 (8.0 units leap)
        { type: 'bridge', x1: 28, x2: 36, y1: 0.3, y2: 0 },
        { type: 'platform', x1: 36, x2: 48, y: 0 }
      ]
    },
    {
      id: 9,
      name: '트리플 스텝 갭 (Triple Stepping Gaps)',
      description: '3연속 징검다리 갭! 과속하지 않고 리듬감 있게 액셀을 밟아 통과하세요.',
      startX: 0,
      finishX: 46,
      segments: [
        { type: 'platform', x1: -5, x2: 6, y: 0 },
        { type: 'bridge', x1: 6, x2: 13, y1: 0, y2: 0.2 },
        // GAP 1: 13 to 18
        { type: 'bridge', x1: 18, x2: 23, y1: 0.1, y2: 0.2 },
        // GAP 2: 23 to 28
        { type: 'bridge', x1: 28, x2: 33, y1: 0.1, y2: 0.2 },
        // GAP 3: 33 to 38
        { type: 'bridge', x1: 38, x2: 43, y1: 0, y2: 0 },
        { type: 'platform', x1: 43, x2: 54, y: 0 }
      ]
    },
    {
      id: 10,
      name: '익스트림 마스터 런 (Ultimate Broken Bridge)',
      description: '최장거리 끊어진 대협곡! 최고 속도로 질주하여 최종 승리를 쟁취하세요!',
      startX: 0,
      finishX: 52,
      segments: [
        { type: 'platform', x1: -5, x2: 12, y: 0 }, // Long Runway
        { type: 'bridge', x1: 12, x2: 22, y1: 0, y2: 1.8 }, // Massive Launch Ramp
        // MEGA GAP: 22 to 32.5 (10.5 units gap across the ocean!)
        { type: 'bridge', x1: 32.5, x2: 42, y1: 0.4, y2: 0 },
        { type: 'platform', x1: 42, x2: 60, y: 0 }
      ]
    }
  ];

  class DriveMadEngine {
    constructor(container) {
      this.container = container;
      this.currentLevelIndex = 0;
      this.gameState = 'PLAYING'; // PLAYING, CRASHED, CLEARED, ALL_CLEARED
      this.keys = { left: false, right: false };

      this.initThree();
      this.initInputs();
      this.loadLevel(0);

      this.lastTime = performance.now();
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    initThree() {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;

      this.scene = new THREE.Scene();
      // Vivid bright sky blue
      this.scene.background = new THREE.Color(0x38bdf8);
      this.scene.fog = new THREE.Fog(0x38bdf8, 35, 120);

      // Camera: Drive Mad 3D side-isometric angle
      this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 200);
      this.camera.position.set(0, 6.5, 14.5);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.container.appendChild(this.renderer.domElement);

      // Sun & Ambient Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
      this.scene.add(ambientLight);

      const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.15);
      sunLight.position.set(20, 30, 25);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 1;
      sunLight.shadow.camera.far = 90;
      sunLight.shadow.camera.left = -30;
      sunLight.shadow.camera.right = 30;
      sunLight.shadow.camera.top = 30;
      sunLight.shadow.camera.bottom = -30;
      this.scene.add(sunLight);

      // Background Mountains & Ocean (Exact like screenshot)
      this.buildBackgroundScenery();

      window.addEventListener('resize', () => {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      });
    }

    buildBackgroundScenery() {
      // 1. Water Plane (Deep blue ocean with foam lines)
      const waterMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
      const water = new THREE.Mesh(new THREE.PlaneGeometry(300, 100), waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.set(20, -3.2, 0);
      water.receiveShadow = true;
      this.scene.add(water);

      // Water Foam White Lines
      const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      for (let i = 0; i < 5; i++) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(80, 0.25), foamMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(i * 30 - 20, -3.15, -4 - (i % 3) * 3);
        this.scene.add(line);
      }

      // 2. Distant Blue Mountain Pyramids (Exactly like user photo)
      const mountainMatLit = new THREE.MeshLambertMaterial({ color: 0x2563eb, flatShading: true });
      const mountainMatDark = new THREE.MeshLambertMaterial({ color: 0x1d4ed8, flatShading: true });

      const createMountain = (x, y, z, size) => {
        const mGroup = new THREE.Group();
        const coneGeom = new THREE.ConeGeometry(size, size * 1.5, 4);
        coneGeom.rotateY(Math.PI / 4);
        const mMesh = new THREE.Mesh(coneGeom, mountainMatLit);
        mMesh.position.y = (size * 1.5) / 2;
        mGroup.add(mMesh);
        mGroup.position.set(x, y, z);
        return mGroup;
      };

      this.scene.add(createMountain(-15, -3, -25, 24));
      this.scene.add(createMountain(20, -3, -35, 36));
      this.scene.add(createMountain(55, -3, -28, 28));

      // 3. Flat White Voxel Clouds
      const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const createCloud = (x, y, z) => {
        const cGroup = new THREE.Group();
        const b1 = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, 2.5), cloudMat);
        const b2 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.4, 2.5), cloudMat);
        b2.position.set(-1, 0.5, 0);
        cGroup.add(b1);
        cGroup.add(b2);
        cGroup.position.set(x, y, z);
        return cGroup;
      };

      this.scene.add(createCloud(-8, 16, -20));
      this.scene.add(createCloud(25, 18, -25));
      this.scene.add(createCloud(60, 15, -18));
    }

    /**
     * Builds the exact 6-Wheeled Yellow Off-Road Truck from the image:
     * - Yellow Voxel Cab with recessed black windshield
     * - Flatbed with pinkish/terracotta wood side railings
     * - 6 Chunky Voxel Off-Road Tires (1 front axle, 2 rear tandem axles)
     */
    createYellow6Wheeler() {
      const group = new THREE.Group();

      const yellowMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 }); // Sunshine Yellow Cab
      const bedWoodMat = new THREE.MeshLambertMaterial({ color: 0xb87474 }); // Terracotta Wood Railing
      const darkMat = new THREE.MeshLambertMaterial({ color: 0x1f2937 });    // Chassis Frame
      const tireMat = new THREE.MeshLambertMaterial({ color: 0x111827 });    // Chunky Black Rubber
      const rimMat = new THREE.MeshLambertMaterial({ color: 0x9ca3af });     // Silver Rim
      const glassMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });   // Dark Black Windshield Cutout

      // 1. Lower Chassis Beam
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.35, 1.3), darkMat);
      chassis.position.set(-0.15, 0.45, 0);
      chassis.castShadow = true;
      group.add(chassis);

      // 2. Yellow Cab (Front Half)
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.95, 1.25), yellowMat);
      cab.position.set(0.65, 1.05, 0);
      cab.castShadow = true;
      group.add(cab);

      // Hood extension in front of cab
      const hood = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 1.2), yellowMat);
      hood.position.set(1.4, 0.85, 0);
      hood.castShadow = true;
      group.add(hood);

      // Recessed Dark Windshield Cutout
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 1.05), glassMat);
      windshield.position.set(1.31, 1.15, 0);
      group.add(windshield);

      // Side Windows
      const sideWinL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.08), glassMat);
      sideWinL.position.set(0.65, 1.15, 0.63);
      const sideWinR = sideWinL.clone();
      sideWinR.position.set(0.65, 1.15, -0.63);
      group.add(sideWinL);
      group.add(sideWinR);

      // 3. Rear Flatbed with Railings (Terracotta Wood)
      const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.25, 1.3), bedWoodMat);
      bedFloor.position.set(-0.95, 0.75, 0);
      bedFloor.castShadow = true;
      group.add(bedFloor);

      // Side Railings along bed
      const railL = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.35, 0.12), bedWoodMat);
      railL.position.set(-0.95, 1.0, 0.62);
      const railR = railL.clone();
      railR.position.set(-0.95, 1.0, -0.62);
      const backRail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 1.3), bedWoodMat);
      backRail.position.set(-1.95, 1.0, 0);
      group.add(railL);
      group.add(railR);
      group.add(backRail);

      // 4. Six Chunky Voxel Wheels (1 front, 2 tandem rear)
      const wheelGeom = new THREE.CylinderGeometry(0.48, 0.48, 0.38, 12);
      wheelGeom.rotateX(Math.PI / 2);
      const rimGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.40, 8);
      rimGeom.rotateX(Math.PI / 2);

      const makeTire = (x, z) => {
        const wGroup = new THREE.Group();
        const tire = new THREE.Mesh(wheelGeom, tireMat);
        tire.castShadow = true;
        const rim = new THREE.Mesh(rimGeom, rimMat);
        wGroup.add(tire);
        wGroup.add(rim);
        wGroup.position.set(x, 0, z);
        return wGroup;
      };

      this.wheelMeshes = [];

      // Front Axle (X = +1.15)
      const wFL = makeTire(1.15, 0.78);
      const wFR = makeTire(1.15, -0.78);
      // Rear Axle 1 (X = -0.55)
      const wML = makeTire(-0.55, 0.78);
      const wMR = makeTire(-0.55, -0.78);
      // Rear Axle 2 (X = -1.55)
      const wRL = makeTire(-1.55, 0.78);
      const wRR = makeTire(-1.55, -0.78);

      group.add(wFL); group.add(wFR);
      group.add(wML); group.add(wMR);
      group.add(wRL); group.add(wRR);

      this.wheelMeshes.push(wFL, wFR, wML, wMR, wRL, wRR);

      return group;
    }

    /**
     * Builds Pinkish Stone Cliff Platform (like screenshot) with Grass Top & Carvings
     */
    createCliffPlatform(x1, x2, y) {
      const group = new THREE.Group();
      const width = x2 - x1;
      const height = 5.0;
      const depth = 5.0;

      // Salmon / Terracotta stone
      const stoneMat = new THREE.MeshLambertMaterial({ color: 0xe29d8f });
      const grassMat = new THREE.MeshLambertMaterial({ color: 0x34d399 }); // Emerald Green
      const trimMat = new THREE.MeshLambertMaterial({ color: 0xb87468 });  // Carved border

      // Main Cliff Block
      const block = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), stoneMat);
      block.position.set((x1 + x2) / 2, y - height / 2, 0);
      block.receiveShadow = true;
      group.add(block);

      // Top Grass Layer
      const grass = new THREE.Mesh(new THREE.BoxGeometry(width + 0.1, 0.25, depth + 0.1), grassMat);
      grass.position.set((x1 + x2) / 2, y + 0.1, 0);
      grass.receiveShadow = true;
      group.add(grass);

      // Square Carved Glyph on front face (like image)
      const glyph = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 0.15), trimMat);
      glyph.position.set(x2 - 1.2, y - 1.2, depth / 2 + 0.05);
      group.add(glyph);

      // Starting Gate Post (if x1 <= 0)
      if (x1 <= 0) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.8, 4.2), trimMat);
        post.position.set(x1 + 0.6, y + 0.9, 0);
        post.castShadow = true;
        group.add(post);
      }

      return group;
    }

    /**
     * Builds Curved Wooden Slat Bridge with Stilts (like screenshot)
     */
    createWoodenBridge(x1, x2, y1, y2, isCurved) {
      const group = new THREE.Group();
      const plankMat = new THREE.MeshLambertMaterial({ color: 0xb87474 }); // Terracotta Pinkish-Brown
      const stiltMat = new THREE.MeshLambertMaterial({ color: 0x8a4949 }); // Darker Wood

      const dist = x2 - x1;
      const numPlanks = Math.max(3, Math.floor(dist * 2.2));
      const stepX = dist / numPlanks;

      for (let i = 0; i < numPlanks; i++) {
        const px = x1 + (i + 0.5) * stepX;
        const t = (px - x1) / dist;

        // Arching curve formula if curved
        let py = y1 + t * (y2 - y1);
        if (isCurved) {
          py += Math.sin(t * Math.PI) * 0.95;
        }

        // Slight angle following curve slope
        const angle = isCurved ? Math.cos(t * Math.PI) * 0.35 : Math.atan2(y2 - y1, dist);

        const plank = new THREE.Mesh(new THREE.BoxGeometry(stepX * 0.88, 0.28, 4.2), plankMat);
        plank.position.set(px, py, 0);
        plank.rotation.z = angle;
        plank.receiveShadow = true;
        group.add(plank);

        // Vertical Stilt Pillar every ~4 units
        if (i > 1 && i < numPlanks - 2 && i % 5 === 0) {
          const stiltHeight = py - (-3.2);
          if (stiltHeight > 0.5) {
            const stilt = new THREE.Mesh(new THREE.BoxGeometry(0.35, stiltHeight, 0.35), stiltMat);
            stilt.position.set(px, py - stiltHeight / 2, 1.8);
            const stiltR = stilt.clone();
            stiltR.position.z = -1.8;
            group.add(stilt);
            group.add(stiltR);
          }
        }
      }

      return group;
    }

    loadLevel(index) {
      if (index >= LEVELS.length) {
        this.gameState = 'ALL_CLEARED';
        this.showModal('victory');
        return;
      }

      this.currentLevelIndex = index;
      const level = LEVELS[index];
      this.currentLevel = level;
      this.gameState = 'PLAYING';

      // Rebuild 3D Level Meshes
      if (this.levelGroup) {
        this.scene.remove(this.levelGroup);
      }
      this.levelGroup = new THREE.Group();
      this.scene.add(this.levelGroup);

      // Build Ground Collider Segments
      this.colliders = [];

      level.segments.forEach(seg => {
        if (seg.type === 'platform') {
          this.levelGroup.add(this.createCliffPlatform(seg.x1, seg.x2, seg.y));
          this.colliders.push({
            type: 'flat',
            x1: seg.x1,
            x2: seg.x2,
            y: seg.y
          });
        } else if (seg.type === 'bridge') {
          const isCurved = !!seg.curved || !!seg.archHeight;
          this.levelGroup.add(this.createWoodenBridge(seg.x1, seg.x2, seg.y1, seg.y2, isCurved));
          this.colliders.push({
            type: 'bridge',
            x1: seg.x1,
            x2: seg.x2,
            y1: seg.y1,
            y2: seg.y2,
            isCurved: isCurved,
            archHeight: seg.archHeight || 0.95
          });
        }
      });

      // Finish Banner at finishX
      const finishArch = this.createFinishGate(level.finishX, 0);
      this.levelGroup.add(finishArch);

      // CRITICAL: Perfectly Stable Spawn (No flipping, placed directly on ground!)
      if (!this.truckMesh) {
        this.truckMesh = this.createYellow6Wheeler();
        this.scene.add(this.truckMesh);
      }

      const spawnX = level.startX || 0;
      const groundAtSpawn = this.getGroundHeightAt(spawnX);

      // Exact resting height on wheels with suspension settled
      const restY = (groundAtSpawn > -50 ? groundAtSpawn : 0) + 0.48;

      this.truck = {
        x: spawnX,
        y: restY,
        angle: 0,
        vx: 0,
        vy: 0,
        angVel: 0,
        wheelRadius: 0.48,
        grounded: true,
        inAirTime: 0
      };

      this.truckMesh.position.set(this.truck.x, this.truck.y, 0);
      this.truckMesh.rotation.z = 0;

      this.updateUI();
      this.hideModal();
    }

    createFinishGate(x, y) {
      const gate = new THREE.Group();
      const poleMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
      const bannerMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
      const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

      const pL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.2, 0.35), poleMat);
      pL.position.set(0, y + 2.1, 2.2);
      const pR = pL.clone();
      pR.position.set(0, y + 2.1, -2.2);
      gate.add(pL);
      gate.add(pR);

      const banner = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 4.7), bannerMat);
      banner.position.set(0, y + 3.8, 0);
      gate.add(banner);

      for (let i = -2; i <= 2; i++) {
        const tile = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.8), (i % 2 === 0) ? whiteMat : poleMat);
        tile.position.set(0, y + 0.04, i * 0.8);
        gate.add(tile);
      }

      gate.position.set(x, y, 0);
      return gate;
    }

    getGroundHeightAt(x) {
      let maxH = -999;
      for (let i = 0; i < this.colliders.length; i++) {
        const c = this.colliders[i];
        if (x >= c.x1 && x <= c.x2) {
          if (c.type === 'flat') {
            if (c.y > maxH) maxH = c.y;
          } else if (c.type === 'bridge') {
            const t = (x - c.x1) / (c.x2 - c.x1);
            let h = c.y1 + t * (c.y2 - c.y1);
            if (c.isCurved) {
              h += Math.sin(t * Math.PI) * c.archHeight;
            }
            if (h > maxH) maxH = h;
          }
        }
      }
      return maxH;
    }

    updatePhysics(dt) {
      if (this.gameState !== 'PLAYING') return;

      const t = this.truck;
      const g = -28; // Realistic Gravity

      t.vy += g * dt;

      // 3 Contact Points for the 6-wheel truck: Front (+1.15), Middle (-0.55), Rear (-1.55)
      const cosA = Math.cos(t.angle);
      const sinA = Math.sin(t.angle);

      const fWx = t.x + 1.15 * cosA;
      const fWy = t.y + 1.15 * sinA - 0.48;

      const mWx = t.x - 0.55 * cosA;
      const mWy = t.y - 0.55 * sinA - 0.48;

      const rWx = t.x - 1.55 * cosA;
      const rWy = t.y - 1.55 * sinA - 0.48;

      const fG = this.getGroundHeightAt(fWx);
      const mG = this.getGroundHeightAt(mWx);
      const rG = this.getGroundHeightAt(rWx);

      const fTouch = (fWy <= fG);
      const mTouch = (mWy <= mG);
      const rTouch = (rWy <= rG);

      const anyGrounded = fTouch || mTouch || rTouch;

      // Engine Acceleration Input
      let driveForce = 0;
      if (this.keys.right) driveForce += 24; // Forward
      if (this.keys.left) driveForce -= 16;  // Reverse / Brake

      if (driveForce !== 0) {
        SoundFX.playEngine(t.vx);
      }

      // Ground Normal & Traction Physics
      if (anyGrounded) {
        t.inAirTime = 0;

        // Spring stiffness & suspension damping
        const k = 130;
        const damp = 9.0;

        let totalNormal = 0;

        // Front Wheel Interaction
        if (fTouch && fG > -50) {
          const pen = fG - fWy;
          const fn = Math.max(0, pen * k - t.vy * damp);
          t.vy += fn * 0.4 * dt;
          t.angVel -= fn * 0.28 * dt; // Tilts back when front hits
          totalNormal += fn;
        }

        // Tandem Rear Wheels Interaction
        if ((mTouch || rTouch) && (mG > -50 || rG > -50)) {
          const rearG = Math.max(mG, rG);
          const rearWy = Math.min(mWy, rWy);
          const pen = rearG - rearWy;
          const fn = Math.max(0, pen * k - t.vy * damp);
          t.vy += fn * 0.6 * dt;
          t.angVel += fn * 0.25 * dt; // Pushes front down
          totalNormal += fn;
        }

        // Traction: Drive forward smoothly
        t.vx += driveForce * 0.8 * dt;

        // Center-of-mass natural level alignment on bridge
        const avgSlope = (fG > -50 && rG > -50) ? Math.atan2(fG - rG, 2.7) : 0;
        t.angVel += (avgSlope - t.angle) * 12 * dt;

        t.grounded = true;
      } else {
        // IN AIR (Jumping over broken bridge gaps!)
        t.inAirTime += dt;
        t.grounded = false;

        // Air Pitch Control: Pressing → or ← tilts vehicle in mid-air to land flat!
        if (this.keys.right) t.angVel -= 3.5 * dt;
        if (this.keys.left) t.angVel += 3.5 * dt;

        // Natural aerodynamic damping in air
        t.angVel *= 0.96;
      }

      // Drag
      t.vx *= t.grounded ? 0.985 : 0.996;
      t.angVel *= 0.92;

      // Kinematic update
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.angle += t.angVel * dt;

      // Wheel Spin Rotation Animation
      const roll = t.vx * dt * 2.8;
      this.wheelMeshes.forEach(w => {
        w.rotation.z -= roll;
      });

      // Win Condition Check (Finish Line)
      if (t.x >= this.currentLevel.finishX) {
        this.gameState = 'CLEARED';
        SoundFX.playWin();
        this.showModal('clear');
        return;
      }

      // Crash Condition Check:
      // 1. Fallen into water gap (y < -2.2)
      // 2. Flipped upside down (angle > 115 deg) near ground
      const absA = Math.abs(t.angle % (Math.PI * 2));
      const isUpsideDown = (absA > 1.95 && absA < (Math.PI * 2 - 1.95));
      const groundBelow = this.getGroundHeightAt(t.x);

      if (t.y < -2.2 || (isUpsideDown && t.y <= groundBelow + 1.3)) {
        this.gameState = 'CRASHED';
        SoundFX.playCrash();
        this.showModal('crash');
      }
    }

    animate(now) {
      requestAnimationFrame(this.animate);

      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;

      this.updatePhysics(dt);

      // Sync 3D Voxel Truck Position & Angle
      if (this.truckMesh) {
        this.truckMesh.position.x = this.truck.x;
        this.truckMesh.position.y = this.truck.y;
        this.truckMesh.rotation.z = this.truck.angle;

        // Smooth Camera Follow
        const targetX = this.truck.x + 3.8;
        const targetY = Math.max(3.8, this.truck.y + 2.6);
        this.camera.position.x += (targetX - this.camera.position.x) * 0.1;
        this.camera.position.y += (targetY - this.camera.position.y) * 0.1;
        this.camera.lookAt(this.truck.x + 1.8, this.truck.y + 0.6, 0);
      }

      this.renderer.render(this.scene, this.camera);
    }

    initInputs() {
      // Keyboard Controls
      window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          this.keys.right = true;
        }
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          this.keys.left = true;
        }
        if (e.key === 'Enter') {
          if (this.gameState === 'CLEARED') {
            this.nextLevel();
          } else if (this.gameState === 'CRASHED') {
            this.restartLevel();
          } else if (this.gameState === 'ALL_CLEARED') {
            this.loadLevel(0);
          }
        }
        if (e.key === 'r' || e.key === 'R') {
          this.restartLevel();
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          this.keys.right = false;
        }
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          this.keys.left = false;
        }
      });

      // Mobile Touch Controls
      const btnLeft = document.getElementById('btnLeft');
      const btnRight = document.getElementById('btnRight');
      if (btnLeft && btnRight) {
        const bindTouch = (el, keyName) => {
          const onDown = (e) => { e.preventDefault(); this.keys[keyName] = true; el.classList.add('is-pressed'); };
          const onUp = (e) => { e.preventDefault(); this.keys[keyName] = false; el.classList.remove('is-pressed'); };
          el.addEventListener('pointerdown', onDown);
          el.addEventListener('pointerup', onUp);
          el.addEventListener('pointercancel', onUp);
          el.addEventListener('pointerleave', onUp);
        };
        bindTouch(btnLeft, 'left');
        bindTouch(btnRight, 'right');
      }

      // HUD Reset & Audio Buttons
      const hudResetBtn = document.getElementById('hudResetBtn');
      if (hudResetBtn) {
        hudResetBtn.addEventListener('click', () => this.restartLevel());
      }

      const hudAudioBtn = document.getElementById('hudAudioBtn');
      if (hudAudioBtn) {
        hudAudioBtn.addEventListener('click', () => {
          const muted = SoundFX.toggleMute();
          hudAudioBtn.textContent = muted ? '🔇 사운드 OFF' : '🔊 사운드 ON';
        });
      }

      // Modal Button Click
      const modalBtn = document.getElementById('gameModalBtn');
      if (modalBtn) {
        modalBtn.addEventListener('click', () => {
          if (this.gameState === 'CLEARED') {
            this.nextLevel();
          } else if (this.gameState === 'CRASHED') {
            this.restartLevel();
          } else if (this.gameState === 'ALL_CLEARED') {
            this.loadLevel(0);
          }
        });
      }
    }

    restartLevel() {
      this.loadLevel(this.currentLevelIndex);
    }

    nextLevel() {
      this.loadLevel(this.currentLevelIndex + 1);
    }

    updateUI() {
      const levelEl = document.getElementById('hudLevel');
      if (levelEl) levelEl.textContent = (this.currentLevelIndex + 1);

      const levelNameEl = document.getElementById('hudLevelName');
      if (levelNameEl && this.currentLevel) levelNameEl.textContent = this.currentLevel.name;

      const dots = document.querySelectorAll('.level-dot');
      dots.forEach((dot, idx) => {
        dot.classList.remove('is-current', 'is-completed');
        if (idx === this.currentLevelIndex) {
          dot.classList.add('is-current');
        } else if (idx < this.currentLevelIndex) {
          dot.classList.add('is-completed');
        }
      });
    }

    showModal(type) {
      const modal = document.getElementById('gameModal');
      const icon = document.getElementById('modalIcon');
      const title = document.getElementById('modalTitle');
      const desc = document.getElementById('modalDesc');
      const btn = document.getElementById('gameModalBtn');

      if (!modal) return;

      if (type === 'clear') {
        icon.textContent = '🏆';
        title.textContent = `LEVEL ${this.currentLevelIndex + 1} 클리어!`;
        desc.textContent = `${this.currentLevel.name} 완주 성공! 결승선을 안전하게 통과했습니다.`;
        btn.className = 'game-primary-btn';
        btn.innerHTML = '다음 단계로 가기 <span class="btn-key-badge">[Enter]</span>';
      } else if (type === 'crash') {
        icon.textContent = '💥';
        title.textContent = '다리에서 떨어지거나 차가 전복되었습니다!';
        desc.textContent = '끊어진 다리를 뛰어넘을 때 충분한 속도로 달리고 공중 균형을 유지하세요.';
        btn.className = 'game-primary-btn game-retry-btn';
        btn.innerHTML = '다시 도전하기 <span class="btn-key-badge">[Enter] / [R]</span>';
      } else if (type === 'victory') {
        icon.textContent = '🎉';
        title.textContent = '10단계 올클리어!';
        desc.textContent = '모든 끊어진 다리와 위험한 바다를 뛰어넘고 드라이브 매드 마스터가 되셨습니다!';
        btn.className = 'game-primary-btn';
        btn.innerHTML = '처음부터 다시하기 <span class="btn-key-badge">[Enter]</span>';
      }

      modal.classList.add('is-active');
    }

    hideModal() {
      const modal = document.getElementById('gameModal');
      if (modal) modal.classList.remove('is-active');
    }
  }

  // Auto Init on DOM Ready
  document.addEventListener('DOMContentLoaded', function () {
    const canvasContainer = document.getElementById('gameViewport');
    if (canvasContainer && window.THREE) {
      window.FITCALC_GAME = new DriveMadEngine(canvasContainer);
    }
  });
})();
