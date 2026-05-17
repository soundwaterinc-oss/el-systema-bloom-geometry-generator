const STEPS = 16;
const ROOT_MIDI = 36;

const rhythmPresets = {
  "Kecak Cycle": [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1],
  "Ewe Bell": [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1],
  "Maqsum Drift": [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0],
  "Gamelan Interlock": [1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1],
  "Huayno Pulse": [1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0],
};

const scalePresets = {
  "Japanese In": [0, 1, 5, 7, 8],
  "Balinese Pelog": [0, 1, 3, 7, 8],
  "Javanese Slendro": [0, 2, 5, 7, 10],
  "Arabic Hijaz": [0, 1, 4, 5, 7, 8, 11],
  "Raga Bhairav": [0, 1, 4, 5, 7, 8, 11],
  "Andean Pentatonic": [0, 3, 5, 7, 10],
  "Ethiopian Tizita": [0, 2, 3, 7, 9],
};

const voicePresets = {
  "Acid Bass": { label: "Acid Bass" },
  "Industrial Metal": { label: "Industrial Metal" },
  "Sheet Metal": { label: "Sheet Metal" },
  "Physical Noise": { label: "Physical Noise" },
  "Data Click": { label: "Data Click" },
  "Bit Noise": { label: "Bit Noise" },
  "Scan Pulse": { label: "Scan Pulse" },
  "White Burst": { label: "White Burst" },
  "Bronze Cluster": { label: "Bronze Cluster" },
  "Gamelan Gong": { label: "Gamelan Gong" },
  "Gamelan Metallophone": { label: "Gamelan Metallophone" },
  "Ritual Chorus": { label: "Ritual Chorus" },
  "Bamboo Thump": { label: "Bamboo Thump" },
  "Pipe Organ": { label: "Pipe Organ" },
  "Fender Rhodes": { label: "Fender Rhodes" },
  Prophet: { label: "Prophet" },
  Voice: { label: "Voice" },
  Kecak: { label: "Kecak" },
};

const visualPresets = {
  Autogenesis: "autogenesis",
  "Cell Vector": "cell-vector",
  "Uploaded Image": "uploaded",
  "Chevron Weave": "woven",
  "Dark Chevron": "dark-woven",
  "Star Lattice": "star",
  "Night Star Lattice": "dark-star",
  "Node Net": "nodes",
  "Cubic Weave": "cubes",
  "Brick Grid": "brick",
  "Black Field": "black-field",
  "Plant Cell": "cell",
};

const scanPathPresets = {
  "Horizontal Raster": "horizontal",
  "Vertical Raster": "vertical",
  Diagonal: "diagonal",
  Spiral: "spiral",
};

const functionPresets = {
  Orbit: (step, features) =>
    Math.floor((step * (1 + features.complexity * 2) + features.edgeDensity * 6) % 8),
  Cascade: (step, features) =>
    Math.floor((step * step * 0.18 + features.density * 9 + step * 0.4) % 8),
  Mirror: (step, features) => {
    const mirrored = step < 8 ? step : 15 - step;
    return Math.floor((mirrored + features.complexity * 5 + features.edgeDensity * 3) % 8);
  },
};

const state = {
  audioContext: null,
  masterBus: null,
  analyser: null,
  analyserData: null,
  synths: null,
  harmonicBeds: {
    bass: null,
    percussion: null,
  },
  droneBed: null,
  autogenesisActive: false,
  autogenesisId: null,
  autogenesisCycle: 0,
  audioFeedback: {
    loudness: 0,
    brightness: 0,
    roughness: 0,
  },
  uploadedImage: null,
  uploadedImageUrl: null,
  defaultCellImage: null,
  scanPath: [],
  isPlaying: false,
  stepIndex: 0,
  nextStepTime: 0,
  schedulerId: null,
  layerPatterns: {
    bass: [],
    drone: [],
    percussion: [],
  },
  geometrySeeds: {
    lanes: 8,
    spacing: 24,
    angleShift: 0.18,
    cells: 18,
  },
  features: {
    density: 0,
    edgeDensity: 0,
    complexity: 0,
  },
};

const elements = {
  audioToggle: document.querySelector("#audioToggle"),
  transportToggle: document.querySelector("#transportToggle"),
  autogenesisToggle: document.querySelector("#autogenesisToggle"),
  mutateButton: document.querySelector("#mutateButton"),
  bpm: document.querySelector("#bpm"),
  bpmValue: document.querySelector("#bpmValue"),
  rhythmPreset: document.querySelector("#rhythmPreset"),
  scalePreset: document.querySelector("#scalePreset"),
  functionPreset: document.querySelector("#functionPreset"),
  visualPreset: document.querySelector("#visualPreset"),
  imageInput: document.querySelector("#imageInput"),
  scanPathPreset: document.querySelector("#scanPathPreset"),
  cutoff: document.querySelector("#cutoff"),
  cutoffValue: document.querySelector("#cutoffValue"),
  resonance: document.querySelector("#resonance"),
  resonanceValue: document.querySelector("#resonanceValue"),
  decay: document.querySelector("#decay"),
  decayValue: document.querySelector("#decayValue"),
  accent: document.querySelector("#accent"),
  accentValue: document.querySelector("#accentValue"),
  slide: document.querySelector("#slide"),
  slideValue: document.querySelector("#slideValue"),
  toneBrightness: document.querySelector("#toneBrightness"),
  toneBrightnessValue: document.querySelector("#toneBrightnessValue"),
  grit: document.querySelector("#grit"),
  gritValue: document.querySelector("#gritValue"),
  noiseMix: document.querySelector("#noiseMix"),
  noiseMixValue: document.querySelector("#noiseMixValue"),
  clickAmount: document.querySelector("#clickAmount"),
  clickAmountValue: document.querySelector("#clickAmountValue"),
  bassVoice: document.querySelector("#bassVoice"),
  droneVoice: document.querySelector("#droneVoice"),
  percussionVoice: document.querySelector("#percussionVoice"),
  bassLevel: document.querySelector("#bassLevel"),
  bassLevelValue: document.querySelector("#bassLevelValue"),
  osc1Drive: document.querySelector("#osc1Drive"),
  osc1DriveValue: document.querySelector("#osc1DriveValue"),
  osc1Spread: document.querySelector("#osc1Spread"),
  osc1SpreadValue: document.querySelector("#osc1SpreadValue"),
  osc1Motion: document.querySelector("#osc1Motion"),
  osc1MotionValue: document.querySelector("#osc1MotionValue"),
  droneLevel: document.querySelector("#droneLevel"),
  droneLevelValue: document.querySelector("#droneLevelValue"),
  droneDrive: document.querySelector("#droneDrive"),
  droneDriveValue: document.querySelector("#droneDriveValue"),
  droneSpread: document.querySelector("#droneSpread"),
  droneSpreadValue: document.querySelector("#droneSpreadValue"),
  droneLfoRate: document.querySelector("#droneLfoRate"),
  droneLfoRateValue: document.querySelector("#droneLfoRateValue"),
  droneLfoDepth: document.querySelector("#droneLfoDepth"),
  droneLfoDepthValue: document.querySelector("#droneLfoDepthValue"),
  percussionLevel: document.querySelector("#percussionLevel"),
  percussionLevelValue: document.querySelector("#percussionLevelValue"),
  osc2Drive: document.querySelector("#osc2Drive"),
  osc2DriveValue: document.querySelector("#osc2DriveValue"),
  osc2Spread: document.querySelector("#osc2Spread"),
  osc2SpreadValue: document.querySelector("#osc2SpreadValue"),
  osc2Motion: document.querySelector("#osc2Motion"),
  osc2MotionValue: document.querySelector("#osc2MotionValue"),
  densityValue: document.querySelector("#densityValue"),
  edgeDensityValue: document.querySelector("#edgeDensityValue"),
  complexityValue: document.querySelector("#complexityValue"),
  canvas: document.querySelector("#geometryCanvas"),
  luminanceCanvas: document.querySelector("#luminanceCanvas"),
  stepGrid: document.querySelector("#stepGrid"),
};

const ctx2d = elements.canvas.getContext("2d");
const luminanceCtx = elements.luminanceCanvas.getContext("2d");

function populatePresets() {
  fillSelect(elements.rhythmPreset, Object.keys(rhythmPresets), "Kecak Cycle");
  fillSelect(elements.scalePreset, Object.keys(scalePresets), "Japanese In");
  fillSelect(elements.functionPreset, Object.keys(functionPresets), "Orbit");
  fillSelect(elements.visualPreset, Object.keys(visualPresets), "Cell Vector");
  fillSelect(elements.scanPathPreset, Object.keys(scanPathPresets), "Horizontal Raster");
  fillSelect(elements.bassVoice, ["Bronze Cluster", "Gamelan Metallophone", "Ritual Chorus", "Pipe Organ"], "Bronze Cluster");
  fillSelect(elements.droneVoice, ["Ritual Chorus", "Gamelan Gong", "Pipe Organ", "Fender Rhodes"], "Ritual Chorus");
  fillSelect(elements.percussionVoice, ["Bronze Cluster", "Gamelan Gong", "Ritual Chorus", "Sheet Metal"], "Bronze Cluster");
}

function fillSelect(select, items, initial) {
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    option.selected = item === initial;
    select.appendChild(option);
  });
}

function bindControls() {
  elements.audioToggle.addEventListener("click", startAudio);
  elements.transportToggle.addEventListener("click", toggleTransport);
  elements.autogenesisToggle.addEventListener("click", toggleAutogenesis);
  elements.mutateButton.addEventListener("click", () => {
    mutateGeometry();
    rebuildPattern();
  });
  elements.imageInput.addEventListener("change", handleImageUpload);

  ["bpm", "cutoff", "resonance", "decay", "accent", "slide", "toneBrightness", "grit", "noiseMix", "clickAmount", "bassLevel", "osc1Drive", "osc1Spread", "osc1Motion", "droneLevel", "droneDrive", "droneSpread", "droneLfoRate", "droneLfoDepth", "percussionLevel", "osc2Drive", "osc2Spread", "osc2Motion"].forEach((id) => {
    elements[id].addEventListener("input", () => {
      syncLabels();
      rebuildPattern(false);
    });
  });

  ["rhythmPreset", "functionPreset", "visualPreset", "scanPathPreset"].forEach((id) => {
    elements[id].addEventListener("change", () => rebuildPattern(false));
  });

  ["bassVoice", "percussionVoice", "droneVoice", "scalePreset"].forEach((id) => {
    elements[id].addEventListener("change", () => rebuildPattern(true));
  });
}

function syncLabels() {
  elements.bpmValue.textContent = elements.bpm.value;
  elements.cutoffValue.textContent = elements.cutoff.value;
  elements.resonanceValue.textContent = Number(elements.resonance.value).toFixed(1);
  elements.decayValue.textContent = Number(elements.decay.value).toFixed(2);
  elements.accentValue.textContent = Number(elements.accent.value).toFixed(2);
  elements.slideValue.textContent = Number(elements.slide.value).toFixed(2);
  elements.toneBrightnessValue.textContent = Number(elements.toneBrightness.value).toFixed(2);
  elements.gritValue.textContent = Number(elements.grit.value).toFixed(2);
  elements.noiseMixValue.textContent = Number(elements.noiseMix.value).toFixed(2);
  elements.clickAmountValue.textContent = Number(elements.clickAmount.value).toFixed(2);
  elements.bassLevelValue.textContent = Number(elements.bassLevel.value).toFixed(2);
  elements.osc1DriveValue.textContent = Number(elements.osc1Drive.value).toFixed(2);
  elements.osc1SpreadValue.textContent = elements.osc1Spread.value;
  elements.osc1MotionValue.textContent = Number(elements.osc1Motion.value).toFixed(2);
  elements.droneLevelValue.textContent = Number(elements.droneLevel.value).toFixed(2);
  elements.droneDriveValue.textContent = Number(elements.droneDrive.value).toFixed(2);
  elements.droneSpreadValue.textContent = elements.droneSpread.value;
  elements.droneLfoRateValue.textContent = Number(elements.droneLfoRate.value).toFixed(2);
  elements.droneLfoDepthValue.textContent = elements.droneLfoDepth.value;
  elements.percussionLevelValue.textContent = Number(elements.percussionLevel.value).toFixed(2);
  elements.osc2DriveValue.textContent = Number(elements.osc2Drive.value).toFixed(2);
  elements.osc2SpreadValue.textContent = elements.osc2Spread.value;
  elements.osc2MotionValue.textContent = Number(elements.osc2Motion.value).toFixed(2);

  if (state.droneBed) {
    state.droneBed.update(getDroneControls());
  }
  if (state.harmonicBeds.bass) {
    state.harmonicBeds.bass.update(getOscBedControls("bass"));
  }
  if (state.harmonicBeds.percussion) {
    state.harmonicBeds.percussion.update(getOscBedControls("percussion"));
  }
}

async function startAudio() {
  if (!state.audioContext) {
    state.audioContext = new AudioContext();
    state.masterBus = state.audioContext.createGain();
    state.masterBus.gain.value = 0.9;
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 2048;
    state.analyser.smoothingTimeConstant = 0.82;
    state.analyserData = new Uint8Array(state.analyser.frequencyBinCount);
    state.masterBus.connect(state.analyser);
    state.analyser.connect(state.audioContext.destination);
    state.synths = {
      bass: createVoiceEngine(state.audioContext, "bass"),
      drone: createVoiceEngine(state.audioContext, "drone"),
      percussion: createVoiceEngine(state.audioContext, "percussion"),
    };
  }

  if (state.audioContext.state !== "running") {
    await state.audioContext.resume();
  }

  elements.audioToggle.textContent = "Audio Ready";
}

async function toggleTransport() {
  if (!state.audioContext) {
    await startAudio();
  }

  state.isPlaying = !state.isPlaying;
  elements.transportToggle.textContent = state.isPlaying ? "Stop Sequencer" : "Start Sequencer";

  if (state.isPlaying) {
    state.stepIndex = 0;
    state.nextStepTime = state.audioContext.currentTime + 0.08;
    startDroneBed();
    startHarmonicBeds();
    state.schedulerId = window.setInterval(schedule, 25);
  } else {
    window.clearInterval(state.schedulerId);
    state.schedulerId = null;
    stopDroneBed();
    stopHarmonicBeds();
    renderSteps();
  }
}

function schedule() {
  const lookAhead = 0.12;
  while (state.nextStepTime < state.audioContext.currentTime + lookAhead) {
    const scanSample = getScanSampleForStep(state.stepIndex);
    if (state.droneBed) {
      state.droneBed.setScanModulation(scanSample);
    }
    if (state.harmonicBeds.bass) {
      state.harmonicBeds.bass.setScanModulation(scanSample);
    }
    if (state.harmonicBeds.percussion) {
      state.harmonicBeds.percussion.setScanModulation(scanSample);
    }
    renderSteps(state.stepIndex);
    state.nextStepTime += getStepDuration();
    state.stepIndex = (state.stepIndex + 1) % STEPS;
  }
}

function getStepDuration() {
  const bpm = Number(elements.bpm.value);
  return (60 / bpm) / 4;
}

function getSynthControls() {
  return {
    cutoff: Number(elements.cutoff.value),
    resonance: Number(elements.resonance.value),
    decay: Number(elements.decay.value),
    accent: Number(elements.accent.value),
    slide: Number(elements.slide.value),
    toneBrightness: Number(elements.toneBrightness.value),
    grit: Number(elements.grit.value),
    noiseMix: Number(elements.noiseMix.value),
    clickAmount: Number(elements.clickAmount.value),
    osc1Drive: Number(elements.osc1Drive.value),
    osc1Spread: Number(elements.osc1Spread.value),
    osc1Motion: Number(elements.osc1Motion.value),
    osc2Drive: Number(elements.osc2Drive.value),
    osc2Spread: Number(elements.osc2Spread.value),
    osc2Motion: Number(elements.osc2Motion.value),
  };
}

function getDroneControls() {
  return {
    cutoff: Number(elements.cutoff.value),
    resonance: Number(elements.resonance.value),
    level: Number(elements.droneLevel.value),
    lfoRate: Number(elements.droneLfoRate.value),
    lfoDepth: Number(elements.droneLfoDepth.value),
    voice: elements.droneVoice.value,
    toneBrightness: Number(elements.toneBrightness.value),
    drive: Number(elements.droneDrive.value),
    spread: Number(elements.droneSpread.value),
  };
}

function getOscBedControls(layer) {
  const isBass = layer === "bass";
  return {
    cutoff: Number(elements.cutoff.value),
    resonance: Number(elements.resonance.value),
    level: isBass ? Number(elements.bassLevel.value) : Number(elements.percussionLevel.value),
    drive: isBass ? Number(elements.osc1Drive.value) : Number(elements.osc2Drive.value),
    spread: isBass ? Number(elements.osc1Spread.value) : Number(elements.osc2Spread.value),
    motion: isBass ? Number(elements.osc1Motion.value) : Number(elements.osc2Motion.value),
    toneBrightness: Number(elements.toneBrightness.value),
    voice: isBass ? elements.bassVoice.value : elements.percussionVoice.value,
  };
}

function playLayerStep(layer, time) {
  const step = state.layerPatterns[layer][state.stepIndex];
  if (step && step.active) {
    state.synths[layer].play(step, time, getSynthControls(), getScanSampleForStep(state.stepIndex));
  }
}

function rebuildPattern(restartDrone = false) {
  state.scanPath = buildScanPath();
  drawGeometry(false);
  state.features = extractFeatures();
  state.layerPatterns = buildLayerPatterns();
  syncFeatureLabels();
  drawScanOverlay();
  drawLuminanceProfile();
  renderSteps();
  if (state.isPlaying && restartDrone) {
    restartDroneBed();
    restartHarmonicBeds();
  }
}

function toggleAutogenesis() {
  state.autogenesisActive = !state.autogenesisActive;
  elements.autogenesisToggle.textContent = state.autogenesisActive ? "Stop Autogenesis" : "Start Autogenesis";
  if (state.autogenesisActive) {
    elements.visualPreset.value = "Autogenesis";
    runAutogenesisCycle();
    state.autogenesisId = window.setInterval(runAutogenesisCycle, 3200);
  } else {
    window.clearInterval(state.autogenesisId);
    state.autogenesisId = null;
  }
}

function runAutogenesisCycle() {
  if (!state.analyser) return;
  const audioFeatures = getMasterAudioFeatures();
  state.audioFeedback = audioFeatures;
  state.autogenesisCycle += 1;
  evolveGeometryFromAudio(audioFeatures);
  rebuildPattern(false);
}

function getMasterAudioFeatures() {
  state.analyser.getByteFrequencyData(state.analyserData);
  let total = 0;
  let weighted = 0;
  let roughness = 0;
  for (let i = 0; i < state.analyserData.length; i += 1) {
    const value = state.analyserData[i] / 255;
    total += value;
    weighted += value * i;
    if (i > 0) {
      roughness += Math.abs(value - (state.analyserData[i - 1] / 255));
    }
  }
  const loudness = total / state.analyserData.length;
  const brightness = total > 0 ? weighted / total / state.analyserData.length : 0;
  return {
    loudness: clamp(loudness * 3, 0, 1),
    brightness: clamp(brightness * 2.2, 0, 1),
    roughness: clamp(roughness / state.analyserData.length * 7, 0, 1),
  };
}

function evolveGeometryFromAudio(audio) {
  state.geometrySeeds = {
    lanes: Math.round(5 + audio.brightness * 10 + audio.roughness * 4),
    spacing: Math.round(34 - audio.loudness * 12 - audio.brightness * 8),
    angleShift: clamp(0.08 + audio.roughness * 0.24 + audio.brightness * 0.08, 0.08, 0.34),
    cells: Math.round(10 + audio.loudness * 10 + audio.roughness * 12),
  };
}

function buildLayerPatterns() {
  return {
    bass: buildBassPattern(),
    drone: buildDronePattern(),
    percussion: buildPercussionPattern(),
  };
}

function buildBassPattern() {
  const scale = scalePresets[elements.scalePreset.value];
  const fn = functionPresets[elements.functionPreset.value];
  const { density, edgeDensity, complexity } = state.features;
  const octaveOffset = density > 0.53 ? 12 : 0;

  return Array.from({ length: STEPS }, (_, step) => {
    const scan = getScanSampleForStep(step);
    const active = true;
    const degreeIndex = fn(step, state.features)
      + Math.floor(density * 2.5)
      + Math.floor(scan.brightness * 3)
      + (step % 3 === 0 ? 1 : 0);
    const scaleNote = scale[((degreeIndex % scale.length) + scale.length) % scale.length];
    const accentThreshold = 0.28 + edgeDensity * 0.42;
    const slideThreshold = 0.35 + complexity * 0.32;
    const accent = normalizedStepValue(step, density, edgeDensity) > accentThreshold;
    const slide = normalizedStepValue(step, complexity, density) > slideThreshold;
    const cutoffMod = Math.round(220 + complexity * 500 + edgeDensity * 420 + scan.edge * 700 + (step % 4) * 35);

    return {
      active,
      accent,
      slide,
      cutoff: Number(elements.cutoff.value) + cutoffMod,
      note: ROOT_MIDI + scaleNote + octaveOffset,
      voice: elements.bassVoice.value,
      level: Number(elements.bassLevel.value) * 1.18,
      durationScale: 3.2 + complexity * 1.4,
      pan: scan.pan,
    };
  });
}

function buildDronePattern() {
  const scale = scalePresets[elements.scalePreset.value];
  const root = ROOT_MIDI + 12 + scale[0];
  const fifth = ROOT_MIDI + 12 + (scale[Math.min(3, scale.length - 1)] ?? 7);
  const third = ROOT_MIDI + 12 + (scale[Math.min(2, scale.length - 1)] ?? 5);

  return Array.from({ length: STEPS }, (_, step) => {
    return {
      active: true,
      accent: false,
      slide: false,
      cutoff: Number(elements.cutoff.value) * 0.72,
      note: [root, fifth, third, fifth][step % 4],
      voice: elements.droneVoice.value,
      level: Number(elements.droneLevel.value),
      durationScale: 1,
    };
  });
}

function buildPercussionPattern() {
  const scale = scalePresets[elements.scalePreset.value];
  const { edgeDensity, complexity } = state.features;

  return Array.from({ length: STEPS }, (_, step) => {
    const scan = getScanSampleForStep(step);
    const degree = scale[(step + Math.floor(scan.brightness * scale.length)) % scale.length];
    const active = true;
    return {
      active,
      accent: step % 4 === 0 || edgeDensity > 0.1 || scan.edge > 0.35,
      slide: scan.contrast > 0.32,
      cutoff: Number(elements.cutoff.value) * (0.9 + scan.brightness * 0.7),
      note: ROOT_MIDI + 24 + degree,
      voice: elements.percussionVoice.value,
      level: Number(elements.percussionLevel.value) * 0.72,
      durationScale: 3.6 + complexity * 1.6,
      pan: scan.pan,
    };
  });
}

function normalizedStepValue(step, a, b) {
  const wave = Math.sin(step * 1.73 + a * Math.PI * 2) * 0.5 + 0.5;
  return (wave * 0.65) + (b * 0.35);
}

function drawGeometry(withOverlay = true) {
  if (visualPresets[elements.visualPreset.value] === "autogenesis") {
    drawAutogenesisField();
    if (withOverlay) drawScanOverlay();
    return;
  }
  if (visualPresets[elements.visualPreset.value] === "cell-vector" && state.defaultCellImage) {
    drawImageToCanvas(state.defaultCellImage);
    if (withOverlay) drawScanOverlay();
    return;
  }

  if (visualPresets[elements.visualPreset.value] === "uploaded" && state.uploadedImage) {
    drawImageToCanvas(state.uploadedImage);
    if (withOverlay) drawScanOverlay();
    return;
  }

  switch (visualPresets[elements.visualPreset.value]) {
    case "dark-woven":
      drawWovenGeometry(true);
      break;
    case "star":
      drawStarLattice();
      break;
    case "dark-star":
      drawStarLattice(true);
      break;
    case "nodes":
      drawNodeNet();
      break;
    case "cubes":
      drawCubicWeave();
      break;
    case "brick":
      drawBrickGrid();
      break;
    case "black-field":
      drawBlackField();
      break;
    case "cell":
      drawPlantCells();
      break;
    case "woven":
    default:
      drawWovenGeometry();
      break;
  }
  if (withOverlay) drawScanOverlay();
}

function drawImageToCanvas(image) {
  const { width, height } = elements.canvas;
  ctx2d.clearRect(0, 0, width, height);
  ctx2d.fillStyle = "#0a0a0a";
  ctx2d.fillRect(0, 0, width, height);
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;
  ctx2d.drawImage(image, x, y, drawWidth, drawHeight);
}

function drawScanOverlay(currentIndex = -1) {
  if (!state.scanPath.length) return;
  ctx2d.save();
  ctx2d.strokeStyle = "rgba(255, 122, 24, 0.88)";
  ctx2d.lineWidth = 2;
  ctx2d.beginPath();
  state.scanPath.forEach((point, index) => {
    if (index === 0) ctx2d.moveTo(point.x, point.y);
    else ctx2d.lineTo(point.x, point.y);
  });
  ctx2d.stroke();

  if (currentIndex >= 0) {
    const point = state.scanPath[currentIndex % state.scanPath.length];
    ctx2d.fillStyle = "#8df9a8";
    ctx2d.beginPath();
    ctx2d.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx2d.fill();
  }
  ctx2d.restore();
}

function buildScanPath() {
  const { width, height } = elements.canvas;
  const pathType = scanPathPresets[elements.scanPathPreset.value];
  const points = [];
  const count = 256;

  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    if (pathType === "vertical") {
      const column = Math.floor(i / 16);
      const row = i % 16;
      points.push({ x: width * (column / 15), y: height * (row / 15) });
    } else if (pathType === "diagonal") {
      points.push({ x: width * t, y: height * t });
    } else if (pathType === "spiral") {
      const angle = t * Math.PI * 8;
      const radius = t * Math.min(width, height) * 0.42;
      points.push({ x: width / 2 + Math.cos(angle) * radius, y: height / 2 + Math.sin(angle) * radius });
    } else {
      const row = Math.floor(i / 16);
      const column = i % 16;
      points.push({ x: width * (column / 15), y: height * (row / 15) });
    }
  }

  return points;
}

function handleImageUpload(event) {
  const [file] = event.target.files;
  if (!file) return;
  const image = new Image();
  image.onload = () => {
    if (state.uploadedImageUrl) {
      URL.revokeObjectURL(state.uploadedImageUrl);
    }
    state.uploadedImage = image;
    state.uploadedImageUrl = image.src;
    elements.visualPreset.value = "Uploaded Image";
    rebuildPattern();
  };
  image.onerror = () => {
    state.uploadedImage = null;
  };
  image.src = URL.createObjectURL(file);
  elements.imageInput.value = "";
}

function loadDefaultCellImage() {
  const image = new Image();
  image.onload = () => {
    state.defaultCellImage = image;
    rebuildPattern();
  };
  image.src = "assets/cell2.vector.svg?v=20260517-8";
}

function drawWovenGeometry(inverted = false) {
  const { width, height } = elements.canvas;
  const { lanes, spacing, angleShift } = state.geometrySeeds;

  ctx2d.clearRect(0, 0, width, height);
  ctx2d.fillStyle = inverted ? "#101010" : "#f5f3ee";
  ctx2d.fillRect(0, 0, width, height);
  ctx2d.strokeStyle = inverted ? "#f5f3ee" : "#121212";
  ctx2d.lineWidth = 4;
  ctx2d.lineCap = "square";

  for (let y = -height; y < height * 2; y += spacing * 2) {
    for (let lane = 0; lane < lanes; lane += 1) {
      const offset = lane * spacing;
      ctx2d.beginPath();
      ctx2d.moveTo(-40, y + offset);
      ctx2d.lineTo(width * 0.28, y + offset + width * angleShift);
      ctx2d.lineTo(width * 0.54, y + offset - 6);
      ctx2d.lineTo(width + 40, y + offset + width * angleShift);
      ctx2d.stroke();
    }
  }

  ctx2d.strokeStyle = inverted ? "#101010" : "#f5f3ee";
  ctx2d.lineWidth = 7;
  for (let x = 0; x < width; x += spacing * 4) {
    ctx2d.beginPath();
    ctx2d.moveTo(x, 0);
    ctx2d.lineTo(x + spacing * 1.6, spacing * 1.6);
    ctx2d.lineTo(x, spacing * 3.2);
    ctx2d.stroke();
  }
}

function drawPlantCells() {
  const { width, height } = elements.canvas;
  const { cells } = state.geometrySeeds;
  ctx2d.clearRect(0, 0, width, height);
  ctx2d.fillStyle = "#ebefd9";
  ctx2d.fillRect(0, 0, width, height);
  ctx2d.strokeStyle = "#254d32";
  ctx2d.lineWidth = 2;

  for (let i = 0; i < cells; i += 1) {
    const x = randomSeeded(i * 17.1) * width;
    const y = randomSeeded(i * 29.7) * height;
    const radius = 34 + randomSeeded(i * 43.3) * 52;
    const sides = 5 + Math.floor(randomSeeded(i * 11.9) * 4);
    ctx2d.beginPath();
    for (let side = 0; side <= sides; side += 1) {
      const angle = (side / sides) * Math.PI * 2;
      const wobble = 0.78 + randomSeeded(i * 61.7 + side) * 0.34;
      const px = x + Math.cos(angle) * radius * wobble;
      const py = y + Math.sin(angle) * radius * wobble;
      if (side === 0) ctx2d.moveTo(px, py);
      else ctx2d.lineTo(px, py);
    }
    ctx2d.closePath();
    ctx2d.stroke();

    ctx2d.fillStyle = "rgba(84, 137, 80, 0.18)";
    ctx2d.fill();
    ctx2d.fillStyle = "#254d32";
    ctx2d.beginPath();
    ctx2d.arc(x, y, radius * 0.16, 0, Math.PI * 2);
    ctx2d.fill();
  }
}

function drawAutogenesisField() {
  const { width, height } = elements.canvas;
  const { lanes, spacing, angleShift, cells } = state.geometrySeeds;
  const { loudness, brightness, roughness } = state.audioFeedback;
  const phase = state.autogenesisCycle * 0.37;
  ctx2d.clearRect(0, 0, width, height);
  ctx2d.fillStyle = "#0b0b0c";
  ctx2d.fillRect(0, 0, width, height);

  ctx2d.strokeStyle = "rgba(244, 244, 238, 0.86)";
  ctx2d.lineWidth = 1.4 + brightness * 2.2;
  for (let lane = 0; lane < lanes; lane += 1) {
    const yBase = (lane / Math.max(1, lanes - 1)) * height;
    ctx2d.beginPath();
    for (let x = 0; x <= width; x += spacing) {
      const y = yBase
        + Math.sin(x * 0.018 + lane * 0.7 + phase) * spacing * angleShift * 6
        + Math.cos(x * 0.011 - phase * 1.3) * roughness * 24;
      if (x === 0) ctx2d.moveTo(x, y);
      else ctx2d.lineTo(x, y);
    }
    ctx2d.stroke();
  }

  ctx2d.strokeStyle = `rgba(255, 255, 255, ${0.18 + loudness * 0.4})`;
  ctx2d.lineWidth = 1;
  const spokes = 4 + Math.round(brightness * 12);
  for (let i = 0; i < spokes; i += 1) {
    const angle = (i / spokes) * Math.PI * 2 + phase;
    ctx2d.beginPath();
    ctx2d.moveTo(width / 2, height / 2);
    ctx2d.lineTo(
      width / 2 + Math.cos(angle) * width * (0.22 + loudness * 0.34),
      height / 2 + Math.sin(angle) * height * (0.22 + roughness * 0.34),
    );
    ctx2d.stroke();
  }

  ctx2d.strokeStyle = `rgba(244, 244, 238, ${0.38 + roughness * 0.5})`;
  for (let i = 0; i < cells; i += 1) {
    const x = randomSeeded(i * 19.7 + lanes) * width;
    const y = randomSeeded(i * 31.1 + spacing) * height;
    const radius = 8 + randomSeeded(i * 47.3 + cells) * (spacing * 1.8);
    ctx2d.beginPath();
    const sides = 4 + Math.round(randomSeeded(i * 13.9 + state.autogenesisCycle) * (4 + roughness * 6));
    for (let side = 0; side <= sides; side += 1) {
      const angle = (side / sides) * Math.PI * 2 + phase * (0.2 + brightness);
      const wobble = 0.72 + randomSeeded(i * 71.3 + side + state.autogenesisCycle) * (0.3 + roughness * 0.5);
      const px = x + Math.cos(angle) * radius * wobble;
      const py = y + Math.sin(angle) * radius * wobble;
      if (side === 0) ctx2d.moveTo(px, py);
      else ctx2d.lineTo(px, py);
    }
    ctx2d.closePath();
    ctx2d.stroke();
  }

  ctx2d.strokeStyle = `rgba(141, 249, 168, ${0.12 + brightness * 0.28})`;
  const bands = 2 + Math.round(loudness * 6);
  for (let band = 0; band < bands; band += 1) {
    const offset = ((band + 1) / (bands + 1)) * width;
    ctx2d.beginPath();
    ctx2d.moveTo(offset, 0);
    ctx2d.bezierCurveTo(
      offset - roughness * 160,
      height * 0.25,
      offset + brightness * 180,
      height * 0.75,
      offset - loudness * 120,
      height,
    );
    ctx2d.stroke();
  }
}

function drawStarLattice(inverted = false) {
  const { width, height } = elements.canvas;
  ctx2d.clearRect(0, 0, width, height);
  ctx2d.fillStyle = inverted ? "#101010" : "#f7f5ef";
  ctx2d.fillRect(0, 0, width, height);
  ctx2d.strokeStyle = inverted ? "#f7f5ef" : "#111";
  ctx2d.lineWidth = 2;
  const size = 92;

  for (let y = -size; y < height + size; y += size) {
    for (let x = -size; x < width + size; x += size) {
      drawStarCell(x, y, size);
    }
  }
}

function drawStarCell(x, y, size) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const reach = size * 0.46;
  for (let i = -3; i <= 3; i += 1) {
    const gap = i * 8;
    ctx2d.beginPath();
    ctx2d.moveTo(cx - reach, cy + gap);
    ctx2d.lineTo(cx - gap, cy + gap);
    ctx2d.lineTo(cx + gap, cy - gap);
    ctx2d.lineTo(cx + reach, cy - gap);
    ctx2d.stroke();
    ctx2d.beginPath();
    ctx2d.moveTo(cx + gap, cy + reach);
    ctx2d.lineTo(cx + gap, cy + gap);
    ctx2d.lineTo(cx - gap, cy - gap);
    ctx2d.lineTo(cx - gap, cy - reach);
    ctx2d.stroke();
  }
}

function drawNodeNet() {
  const { width, height } = elements.canvas;
  ctx2d.clearRect(0, 0, width, height);
  ctx2d.fillStyle = "#f7f5ef";
  ctx2d.fillRect(0, 0, width, height);
  ctx2d.strokeStyle = "#171310";
  ctx2d.lineWidth = 2;
  const gap = 110;

  for (let y = -gap; y < height + gap; y += gap) {
    for (let x = -gap; x < width + gap; x += gap) {
      ctx2d.beginPath();
      ctx2d.moveTo(x + gap / 2, y);
      ctx2d.lineTo(x + gap, y + gap / 2);
      ctx2d.lineTo(x + gap / 2, y + gap);
      ctx2d.lineTo(x, y + gap / 2);
      ctx2d.closePath();
      ctx2d.stroke();
      ctx2d.beginPath();
      ctx2d.arc(x + gap / 2, y + gap / 2, 26, 0, Math.PI * 2);
      ctx2d.fillStyle = "#171310";
      ctx2d.fill();
      ctx2d.fillStyle = "#f7f5ef";
    }
  }
}

function drawCubicWeave() {
  const { width, height } = elements.canvas;
  ctx2d.clearRect(0, 0, width, height);
  ctx2d.fillStyle = "#101010";
  ctx2d.fillRect(0, 0, width, height);
  ctx2d.strokeStyle = "#f8f8f8";
  ctx2d.lineWidth = 5;
  const w = 110;
  const h = 90;

  for (let y = -h; y < height + h; y += h) {
    for (let x = -w; x < width + w; x += w) {
      const ox = x + ((Math.floor(y / h) % 2) ? w / 2 : 0);
      ctx2d.beginPath();
      ctx2d.moveTo(ox, y + h / 2);
      ctx2d.lineTo(ox + w / 2, y);
      ctx2d.lineTo(ox + w, y + h / 2);
      ctx2d.lineTo(ox + w / 2, y + h);
      ctx2d.closePath();
      ctx2d.stroke();
      ctx2d.beginPath();
      ctx2d.moveTo(ox + w / 2, y);
      ctx2d.lineTo(ox + w / 2, y + h / 2);
      ctx2d.lineTo(ox, y + h);
      ctx2d.stroke();
    }
  }
}

function drawBrickGrid() {
  const { width, height } = elements.canvas;
  ctx2d.clearRect(0, 0, width, height);
  ctx2d.fillStyle = "#f7f5ef";
  ctx2d.fillRect(0, 0, width, height);
  ctx2d.strokeStyle = "#111";
  ctx2d.lineWidth = 3;
  const brickW = 96;
  const brickH = 54;

  for (let row = -1; row < Math.ceil(height / brickH) + 1; row += 1) {
    const y = row * brickH;
    const offset = row % 2 === 0 ? 0 : brickW / 2;
    for (let x = -brickW; x < width + brickW; x += brickW) {
      ctx2d.strokeRect(x + offset, y, brickW, brickH);
      ctx2d.beginPath();
      ctx2d.moveTo(x + offset + brickW * 0.38, y);
      ctx2d.lineTo(x + offset + brickW * 0.38, y + brickH);
      ctx2d.stroke();
      ctx2d.beginPath();
      ctx2d.moveTo(x + offset + brickW * 0.62, y);
      ctx2d.lineTo(x + offset + brickW * 0.62, y + brickH);
      ctx2d.stroke();
    }
  }
}

function drawBlackField() {
  const { width, height } = elements.canvas;
  ctx2d.clearRect(0, 0, width, height);
  ctx2d.fillStyle = "#0a0a0a";
  ctx2d.fillRect(0, 0, width, height);
  ctx2d.strokeStyle = "#f1eee7";
  ctx2d.lineWidth = 3;

  for (let i = 0; i < 22; i += 1) {
    const x = randomSeeded(i * 13.1) * width;
    const y = randomSeeded(i * 31.7) * height;
    const radius = 18 + randomSeeded(i * 71.3) * 74;
    ctx2d.beginPath();
    ctx2d.arc(x, y, radius, 0, Math.PI * 2);
    ctx2d.stroke();
  }

  for (let y = -40; y < height + 80; y += 48) {
    ctx2d.beginPath();
    ctx2d.moveTo(0, y);
    ctx2d.lineTo(width, y + 80);
    ctx2d.stroke();
  }
}

function extractFeatures() {
  const { width, height } = elements.canvas;
  const data = ctx2d.getImageData(0, 0, width, height).data;
  let activePixels = 0;
  let edgePixels = 0;
  let transitions = 0;

  const brightnessAt = (x, y) => {
    const idx = (y * width + x) * 4;
    return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
  };

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const center = brightnessAt(x, y);
      if (center < 220) {
        activePixels += 1;
      }

      const right = brightnessAt(x + 1, y);
      const down = brightnessAt(x, y + 1);
      const delta = Math.abs(center - right) + Math.abs(center - down);
      if (delta > 50) {
        edgePixels += 1;
      }
      if ((center < 220) !== (right < 220)) {
        transitions += 1;
      }
      if ((center < 220) !== (down < 220)) {
        transitions += 1;
      }
    }
  }

  const totalPixels = width * height;
  return {
    density: clamp(activePixels / totalPixels, 0, 1),
    edgeDensity: clamp(edgePixels / totalPixels, 0, 1),
    complexity: clamp(transitions / (totalPixels * 0.4), 0, 1),
  };
}

function getLuminanceProfile() {
  if (!state.scanPath.length) return [];
  const { width } = elements.canvas;
  const data = ctx2d.getImageData(0, 0, elements.canvas.width, elements.canvas.height).data;
  return state.scanPath.map(({ x, y }) => {
    const px = clamp(Math.round(x), 0, elements.canvas.width - 1);
    const py = clamp(Math.round(y), 0, elements.canvas.height - 1);
    const idx = (py * width + px) * 4;
    return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
  });
}

function getScanSamples() {
  const profile = getLuminanceProfile();
  return profile.map((value, index) => {
    const previous = profile[Math.max(0, index - 1)] ?? value;
    const next = profile[Math.min(profile.length - 1, index + 1)] ?? value;
    const brightness = value / 255;
    const contrast = Math.abs(next - previous) / 255;
    const edge = Math.abs(next - value) / 255;
    const point = state.scanPath[index] ?? { x: 0 };
    return {
      brightness,
      contrast,
      edge,
      pan: ((point.x / elements.canvas.width) * 2) - 1,
    };
  });
}

function getScanSampleForStep(step) {
  const samples = getScanSamples();
  if (!samples.length) {
    return { brightness: 0.5, contrast: 0, edge: 0, pan: 0 };
  }
  const index = Math.floor((step / STEPS) * samples.length);
  return samples[Math.min(samples.length - 1, index)];
}

function drawLuminanceProfile(currentIndex = -1) {
  const profile = getLuminanceProfile();
  const { width, height } = elements.luminanceCanvas;
  luminanceCtx.clearRect(0, 0, width, height);
  luminanceCtx.fillStyle = "#0c1218";
  luminanceCtx.fillRect(0, 0, width, height);
  if (!profile.length) return;

  luminanceCtx.strokeStyle = "#ffb36d";
  luminanceCtx.lineWidth = 2;
  luminanceCtx.beginPath();
  profile.forEach((value, index) => {
    const x = (index / (profile.length - 1)) * width;
    const y = height - (value / 255) * height;
    if (index === 0) luminanceCtx.moveTo(x, y);
    else luminanceCtx.lineTo(x, y);
  });
  luminanceCtx.stroke();

  if (currentIndex >= 0) {
    const x = ((currentIndex % profile.length) / (profile.length - 1)) * width;
    luminanceCtx.strokeStyle = "#8df9a8";
    luminanceCtx.beginPath();
    luminanceCtx.moveTo(x, 0);
    luminanceCtx.lineTo(x, height);
    luminanceCtx.stroke();
  }
}

function syncFeatureLabels() {
  elements.densityValue.textContent = state.features.density.toFixed(2);
  elements.edgeDensityValue.textContent = state.features.edgeDensity.toFixed(2);
  elements.complexityValue.textContent = state.features.complexity.toFixed(2);
}

function renderSteps(currentStep = -1) {
  drawGeometry(false);
  drawScanOverlay(currentStep >= 0 ? Math.floor((currentStep / STEPS) * state.scanPath.length) : -1);
  drawLuminanceProfile(currentStep >= 0 ? Math.floor((currentStep / STEPS) * state.scanPath.length) : -1);
  elements.stepGrid.innerHTML = "";
  [
    ["bass", "OSC1"],
    ["drone", "Drone"],
    ["percussion", "OSC2"],
  ].forEach(([key, label]) => {
    const row = document.createElement("section");
    row.className = "layer-row";
    row.innerHTML = `<div class="layer-row-header"><strong>${label}</strong><span>${state.layerPatterns[key][0]?.voice ?? ""}</span></div>`;
    const grid = document.createElement("div");
    grid.className = "step-grid";

    state.layerPatterns[key].forEach((step, index) => {
      const item = document.createElement("div");
      item.className = "step";
      if (!step.active) item.classList.add("is-rest");
      if (step.accent) item.classList.add("is-accent");
      if (step.slide) item.classList.add("is-slide");
      if (index === currentStep) item.classList.add("is-current");
      item.innerHTML = `
        <small>${index + 1}</small>
        <strong>${step.active ? midiToNote(step.note) : "Rest"}</strong>
        <small>${step.active ? `${step.accent ? "Accent " : ""}${step.slide ? "Slide " : ""}` : "Muted"}</small>
      `;
      grid.appendChild(item);
    });
    row.appendChild(grid);
    elements.stepGrid.appendChild(row);
  });
}

function midiToNote(midi) {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  return `${names[midi % 12]}${octave}`;
}

function mutateGeometry() {
  state.geometrySeeds = {
    lanes: randomInt(6, 11),
    spacing: randomInt(18, 32),
    angleShift: randomFloat(0.12, 0.28),
    cells: randomInt(14, 24),
  };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomSeeded(value) {
  const x = Math.sin(value * 999.91) * 43758.5453;
  return x - Math.floor(x);
}

function createVoiceEngine(audioContext, layer) {
  const filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  filter.Q.value = 12;

  const output = audioContext.createGain();
  output.gain.value = 0.7;
  filter.connect(output);
  output.connect(state.masterBus);

  let lastFrequency = 110;

  return {
    play(step, time, controls, scanSample) {
      const frequency = midiToFrequency(step.note) * (1 + (scanSample.brightness - 0.5) * 0.08);
      const attackGain = (step.accent ? controls.accent + state.features.edgeDensity * 0.5 : 0.72) * (step.level ?? 1);
      const baseLength = step.slide ? getStepDuration() + controls.slide : controls.decay;
      const noteLength = baseLength * (step.durationScale ?? 1);
      const targetCutoff = clamp(step.cutoff, 120, 4000);
      const voiceProfile = getVoiceProfile(step.voice);

      filter.frequency.cancelScheduledValues(time);
      filter.Q.cancelScheduledValues(time);
      filter.type = voiceProfile.filterType;
      filter.frequency.setValueAtTime(targetCutoff * voiceProfile.startCutoff * controls.toneBrightness, time);
      filter.frequency.linearRampToValueAtTime(targetCutoff * voiceProfile.peakCutoff * controls.toneBrightness, time + voiceProfile.attack);
      filter.frequency.exponentialRampToValueAtTime(Math.max(140, targetCutoff * voiceProfile.releaseCutoff * controls.toneBrightness), time + noteLength);
      filter.Q.setValueAtTime(controls.resonance * voiceProfile.qScale, time);

      const layerDrive = layer === "bass" ? controls.osc1Drive : layer === "percussion" ? controls.osc2Drive : controls.grit;
      const layerSpread = layer === "bass" ? controls.osc1Spread : layer === "percussion" ? controls.osc2Spread : 0;
      const layerMotion = layer === "bass" ? controls.osc1Motion : layer === "percussion" ? controls.osc2Motion : 0;
      const source = createVoiceSource(audioContext, step.voice, frequency, time, noteLength, step.slide, controls.slide, lastFrequency, controls, layerSpread);
      const amp = audioContext.createGain();
      const shaper = audioContext.createWaveShaper();
      const panner = audioContext.createStereoPanner();
      const texture = createSustainedTexture(audioContext, noteLength, controls.noiseMix * (0.08 + scanSample.edge * 0.24));
      panner.pan.setValueAtTime(clamp((step.pan ?? scanSample.pan ?? 0) * layerMotion, -1, 1), time);
      shaper.curve = createSoftClipCurve(controls.grit + layerDrive);
      shaper.oversample = "2x";
      amp.gain.setValueAtTime(0.0001, time);
      amp.gain.exponentialRampToValueAtTime(attackGain, time + 0.005);
      amp.gain.exponentialRampToValueAtTime(0.0001, time + noteLength);
      source.output.connect(amp);
      texture.output.connect(amp);
      amp.connect(shaper);
      shaper.connect(panner);
      panner.connect(filter);
      source.start(time);
      texture.start(time);
      source.stop(time + noteLength + 0.05);
      texture.stop(time + noteLength + 0.05);
      lastFrequency = frequency;
    },
  };
}

function createVoiceSource(audioContext, voice, frequency, time, noteLength, slide, slideTime, lastFrequency, controls, spread = 0) {
  switch (voice) {
    case "Bronze Cluster":
      return createLayeredOscillators(audioContext, [
        { type: "sine", ratio: 1, gain: 0.34, detune: -3 },
        { type: "sine", ratio: 1.17, gain: 0.18, detune: 4 },
        { type: "sine", ratio: 1.27, gain: 0.2 },
        { type: "triangle", ratio: 1.78, gain: 0.16, detune: -5 },
        { type: "sine", ratio: 2.41, gain: 0.14 },
        { type: "sine", ratio: 3.13, gain: 0.1, detune: 7 },
      ], frequency, time, slide, slideTime, lastFrequency, spread);
    case "Industrial Metal":
      return createLayeredOscillators(audioContext, [
        { type: "sawtooth", ratio: 1, gain: 0.42 },
        { type: "square", ratio: 1.414, gain: 0.2 },
        { type: "sine", ratio: 2.71, gain: 0.22 },
        { type: "triangle", ratio: 4.11, gain: 0.14 },
      ], frequency, time, slide, slideTime, lastFrequency, spread);
    case "Sheet Metal":
      return createLayeredOscillators(audioContext, [
        { type: "triangle", ratio: 1, gain: 0.24, detune: -4 },
        { type: "sine", ratio: 1.61, gain: 0.16, detune: 5 },
        { type: "sine", ratio: 2.13, gain: 0.2 },
        { type: "sine", ratio: 3.89, gain: 0.18 },
        { type: "sine", ratio: 5.43, gain: 0.14 },
        { type: "sine", ratio: 7.17, gain: 0.08 },
      ], frequency, time, slide, slideTime, lastFrequency, spread);
    case "Physical Noise":
      return createPhysicalNoise(audioContext, frequency, noteLength, time);
    case "Data Click":
      return createDataClick(audioContext, frequency, noteLength, time, controls.clickAmount);
    case "Bit Noise":
      return createBitNoise(audioContext, frequency, noteLength, time, controls.grit);
    case "Scan Pulse":
      return createScanPulse(audioContext, frequency, time, slide, slideTime, lastFrequency);
    case "White Burst":
      return createWhiteBurst(audioContext, noteLength, time, controls.noiseMix);
    case "Gamelan Gong":
      return createLayeredOscillators(audioContext, [
        { type: "sine", ratio: 1, gain: 0.34 },
        { type: "sine", ratio: 1.21, gain: 0.14, detune: -4 },
        { type: "sine", ratio: 1.52, gain: 0.18 },
        { type: "sine", ratio: 2.08, gain: 0.16 },
        { type: "sine", ratio: 2.71, gain: 0.12 },
        { type: "triangle", ratio: 3.43, gain: 0.08 },
      ], frequency * 0.5, time, slide, slideTime, lastFrequency * 0.5, spread);
    case "Gamelan Metallophone":
      return createLayeredOscillators(audioContext, [
        { type: "sine", ratio: 1, gain: 0.28, detune: -3 },
        { type: "triangle", ratio: 1.19, gain: 0.12, detune: 5 },
        { type: "sine", ratio: 1.39, gain: 0.18 },
        { type: "sine", ratio: 2.03, gain: 0.16 },
        { type: "sine", ratio: 2.77, gain: 0.12 },
        { type: "sine", ratio: 3.76, gain: 0.1 },
      ], frequency, time, slide, slideTime, lastFrequency, spread);
    case "Ritual Chorus":
      return createRitualChorus(audioContext, frequency, time, slide, slideTime, lastFrequency, spread);
    case "Bamboo Thump":
      return createBambooThump(audioContext, frequency, noteLength, time);
    case "Pipe Organ":
      return createLayeredOscillators(audioContext, [
        { type: "sine", ratio: 1, gain: 0.7 },
        { type: "sine", ratio: 2, gain: 0.35 },
        { type: "sine", ratio: 3, gain: 0.18 },
      ], frequency, time, slide, slideTime, lastFrequency, spread);
    case "Fender Rhodes":
      return createLayeredOscillators(audioContext, [
        { type: "sine", ratio: 1, gain: 0.75 },
        { type: "sine", ratio: 2.01, gain: 0.24 },
        { type: "triangle", ratio: 4, gain: 0.08 },
      ], frequency, time, slide, slideTime, lastFrequency, spread);
    case "Prophet":
      return createLayeredOscillators(audioContext, [
        { type: "sawtooth", ratio: 1, gain: 0.55 },
        { type: "sawtooth", ratio: 1.01, gain: 0.45 },
      ], frequency, time, slide, slideTime, lastFrequency, spread);
    case "Voice":
      return createFormantVoice(audioContext, frequency, time, slide, slideTime, lastFrequency, false, spread);
    case "Kecak":
      return createFormantVoice(audioContext, frequency * 1.5, time, false, 0, lastFrequency, true, spread);
    case "Acid Bass":
    default:
      return createLayeredOscillators(audioContext, [{ type: "sawtooth", ratio: 1, gain: 1 }], frequency, time, slide, slideTime, lastFrequency, spread);
  }
}

function getVoiceProfile(voice) {
  switch (voice) {
    case "Industrial Metal":
    case "Sheet Metal":
    case "Gamelan Metallophone":
    case "Bronze Cluster":
      return { filterType: "highpass", startCutoff: 0.42, peakCutoff: 1.8, releaseCutoff: 0.7, attack: 0.008, qScale: 1.35 };
    case "Physical Noise":
    case "White Burst":
      return { filterType: "bandpass", startCutoff: 0.8, peakCutoff: 1.7, releaseCutoff: 0.72, attack: 0.004, qScale: 1.6 };
    case "Data Click":
      return { filterType: "highpass", startCutoff: 0.9, peakCutoff: 2.2, releaseCutoff: 0.88, attack: 0.002, qScale: 1.8 };
    case "Bit Noise":
      return { filterType: "bandpass", startCutoff: 0.6, peakCutoff: 1.45, releaseCutoff: 0.76, attack: 0.006, qScale: 1.5 };
    case "Scan Pulse":
      return { filterType: "highpass", startCutoff: 0.7, peakCutoff: 1.95, releaseCutoff: 0.82, attack: 0.004, qScale: 1.45 };
    case "Voice":
    case "Kecak":
    case "Ritual Chorus":
      return { filterType: "bandpass", startCutoff: 0.7, peakCutoff: 1.35, releaseCutoff: 0.82, attack: 0.01, qScale: 1.15 };
    case "Gamelan Gong":
      return { filterType: "lowpass", startCutoff: 0.45, peakCutoff: 1.15, releaseCutoff: 0.55, attack: 0.02, qScale: 0.8 };
    default:
      return { filterType: "lowpass", startCutoff: 0.65, peakCutoff: 1.25, releaseCutoff: 0.48, attack: 0.03, qScale: 1 };
  }
}

function createLayeredOscillators(audioContext, layers, frequency, time, slide, slideTime, lastFrequency, spread = 0) {
  const output = audioContext.createGain();
  const energy = layers.reduce((sum, layer) => sum + (layer.gain ** 2), 0);
  output.gain.value = energy > 0 ? 0.72 / Math.sqrt(energy) : 1;
  const nodes = layers.map((layer) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = layer.type;
    oscillator.detune.value = (layer.detune ?? 0) + centeredSpread(index, layers.length, spread);
    const gain = audioContext.createGain();
    gain.gain.value = layer.gain;
    oscillator.connect(gain);
    gain.connect(output);
    setPitch(oscillator.frequency, frequency * layer.ratio, time, slide, slideTime, lastFrequency * layer.ratio);
    return oscillator;
  });
  return {
    output,
    start(startTime) {
      nodes.forEach((node) => node.start(startTime));
    },
    stop(stopTime) {
      nodes.forEach((node) => node.stop(stopTime));
    },
  };
}

function createNoiseSource(audioContext, noteLength) {
  const buffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * (noteLength + 0.1)), audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  return {
    output: source,
    start(startTime) {
      source.start(startTime);
    },
    stop(stopTime) {
      source.stop(stopTime);
    },
  };
}

function createSustainedTexture(audioContext, noteLength, amount) {
  const source = createNoiseSource(audioContext, noteLength);
  const gain = audioContext.createGain();
  gain.gain.value = amount;
  source.output.connect(gain);
  return {
    output: gain,
    start(startTime) {
      source.start(startTime);
    },
    stop(stopTime) {
      source.stop(stopTime);
    },
  };
}

function createSoftClipCurve(amount) {
  const samples = 256;
  const curve = new Float32Array(samples);
  const drive = 1 + amount * 9;
  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  return curve;
}

function createPhysicalNoise(audioContext, frequency, noteLength, time) {
  const noise = createNoiseSource(audioContext, noteLength);
  const impulse = audioContext.createOscillator();
  const impulseGain = audioContext.createGain();
  const output = audioContext.createGain();
  impulse.type = "triangle";
  impulse.frequency.value = frequency * 3.2;
  impulseGain.gain.setValueAtTime(0.9, time);
  impulseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
  noise.output.connect(output);
  impulse.connect(impulseGain);
  impulseGain.connect(output);
  return {
    output,
    start(startTime) {
      noise.start(startTime);
      impulse.start(startTime);
    },
    stop(stopTime) {
      noise.stop(stopTime);
      impulse.stop(stopTime);
    },
  };
}

function createDataClick(audioContext, frequency, noteLength, time, clickAmount) {
  const output = audioContext.createGain();
  const click = audioContext.createOscillator();
  const tick = audioContext.createOscillator();
  const clickGain = audioContext.createGain();
  const tickGain = audioContext.createGain();
  click.type = "square";
  tick.type = "sine";
  click.frequency.value = Math.max(1800, frequency * 16);
  tick.frequency.value = Math.max(3200, frequency * 24);
  clickGain.gain.setValueAtTime(0.95 * clickAmount, time);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.018);
  tickGain.gain.setValueAtTime(0.5 * clickAmount, time);
  tickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
  click.connect(clickGain);
  tick.connect(tickGain);
  clickGain.connect(output);
  tickGain.connect(output);
  return {
    output,
    start(startTime) {
      click.start(startTime);
      tick.start(startTime);
    },
    stop(stopTime) {
      click.stop(Math.min(stopTime, time + Math.min(noteLength, 0.05)));
      tick.stop(Math.min(stopTime, time + Math.min(noteLength, 0.06)));
    },
  };
}

function createBitNoise(audioContext, frequency, noteLength, time, grit) {
  const buffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * (noteLength + 0.1)), audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  const stride = Math.max(2, Math.floor(audioContext.sampleRate / Math.max(80, frequency * 2)));
  let current = 1;
  for (let i = 0; i < data.length; i += 1) {
    if (i % stride === 0) {
      current = Math.random() > 0.5 ? 1 : -1;
    }
    data[i] = current * (0.45 + grit * 0.55);
  }
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  return {
    output: source,
    start(startTime) {
      source.start(startTime);
    },
    stop(stopTime) {
      source.stop(stopTime);
    },
  };
}

function createScanPulse(audioContext, frequency, time, slide, slideTime, lastFrequency) {
  return createLayeredOscillators(audioContext, [
    { type: "square", ratio: 1, gain: 0.62 },
    { type: "sine", ratio: 8, gain: 0.16 },
    { type: "sine", ratio: 16, gain: 0.1 },
  ], frequency, time, slide, slideTime, lastFrequency);
}

function createWhiteBurst(audioContext, noteLength, time, noiseMix) {
  const source = createNoiseSource(audioContext, noteLength);
  const output = audioContext.createGain();
  output.gain.setValueAtTime(noiseMix, time);
  output.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(noteLength, 0.08));
  source.output.connect(output);
  return {
    output,
    start(startTime) {
      source.start(startTime);
    },
    stop(stopTime) {
      source.stop(stopTime);
    },
  };
}

function createBambooThump(audioContext, frequency, noteLength, time) {
  const body = createLayeredOscillators(audioContext, [
    { type: "sine", ratio: 0.5, gain: 0.6 },
    { type: "triangle", ratio: 1, gain: 0.24 },
  ], frequency, time, false, 0, frequency);
  const knock = createPhysicalNoise(audioContext, frequency * 0.7, Math.min(noteLength, 0.18), time);
  const output = audioContext.createGain();
  body.output.connect(output);
  knock.output.connect(output);
  return {
    output,
    start(startTime) {
      body.start(startTime);
      knock.start(startTime);
    },
    stop(stopTime) {
      body.stop(stopTime);
      knock.stop(stopTime);
    },
  };
}

function createRitualChorus(audioContext, frequency, time, slide, slideTime, lastFrequency, spread = 0) {
  return createLayeredOscillators(audioContext, [
    { type: "sawtooth", ratio: 1, gain: 0.18, detune: -11 },
    { type: "sawtooth", ratio: 1, gain: 0.18, detune: 9 },
    { type: "triangle", ratio: 1.01, gain: 0.16, detune: 3 },
    { type: "triangle", ratio: 1.5, gain: 0.14, detune: -5 },
    { type: "sine", ratio: 2, gain: 0.12, detune: 4 },
    { type: "sine", ratio: 2.98, gain: 0.08, detune: -7 },
  ], frequency, time, slide, slideTime, lastFrequency, spread);
}

function startDroneBed() {
  if (!state.audioContext) return;
  stopDroneBed();
  const scale = scalePresets[elements.scalePreset.value];
  const root = ROOT_MIDI + 12 + scale[0];
  const fifth = ROOT_MIDI + 12 + (scale[Math.min(3, scale.length - 1)] ?? 7);
  const third = ROOT_MIDI + 12 + (scale[Math.min(2, scale.length - 1)] ?? 5);
  state.droneBed = createDroneBed(state.audioContext, [root, third, fifth], getDroneControls());
  state.droneBed.start(state.audioContext.currentTime);
}

function stopDroneBed() {
  if (!state.droneBed || !state.audioContext) return;
  state.droneBed.stop(state.audioContext.currentTime + 0.08);
  state.droneBed = null;
}

function restartDroneBed() {
  stopDroneBed();
  startDroneBed();
}

function startHarmonicBeds() {
  if (!state.audioContext) return;
  stopHarmonicBeds();
  const scale = scalePresets[elements.scalePreset.value];
  const root = scale[0];
  const third = scale[Math.min(2, scale.length - 1)] ?? 5;
  const fifth = scale[Math.min(3, scale.length - 1)] ?? 7;
  state.harmonicBeds.bass = createContinuousBed(
    state.audioContext,
    [ROOT_MIDI + root, ROOT_MIDI + third, ROOT_MIDI + fifth],
    getOscBedControls("bass"),
    "bass",
  );
  state.harmonicBeds.percussion = createContinuousBed(
    state.audioContext,
    [ROOT_MIDI + 24 + root, ROOT_MIDI + 24 + third, ROOT_MIDI + 24 + fifth],
    getOscBedControls("percussion"),
    "percussion",
  );
  state.harmonicBeds.bass.start(state.audioContext.currentTime);
  state.harmonicBeds.percussion.start(state.audioContext.currentTime);
}

function stopHarmonicBeds() {
  if (!state.audioContext) return;
  ["bass", "percussion"].forEach((layer) => {
    if (state.harmonicBeds[layer]) {
      state.harmonicBeds[layer].stop(state.audioContext.currentTime + 0.08);
      state.harmonicBeds[layer] = null;
    }
  });
}

function restartHarmonicBeds() {
  stopHarmonicBeds();
  startHarmonicBeds();
}

function createDroneBed(audioContext, notes, controls) {
  const output = audioContext.createGain();
  const shaper = audioContext.createWaveShaper();
  const droneNormalization = 1 / (Math.sqrt(notes.length * 2) * 9);
  output.gain.value = controls.level * droneNormalization;
  shaper.curve = createSoftClipCurve(controls.drive);
  shaper.oversample = "2x";
  const filter = audioContext.createBiquadFilter();
  filter.type = controls.voice === "Ritual Chorus" ? "bandpass" : "lowpass";
  filter.frequency.value = controls.cutoff * 0.78 * controls.toneBrightness;
  filter.Q.value = controls.resonance * 0.75;
  output.connect(shaper);
  shaper.connect(filter);
  filter.connect(state.masterBus);

  const oscillators = notes.flatMap((note, index) => createDroneOscillatorSet(audioContext, note, controls.voice, index, controls.spread));
  oscillators.forEach((node) => node.connect(output));

  const lfo = audioContext.createOscillator();
  const lfoGain = audioContext.createGain();
  lfo.frequency.value = controls.lfoRate;
  lfoGain.gain.value = controls.lfoDepth;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  return {
    start(time) {
      oscillators.forEach((node) => node.start(time));
      lfo.start(time);
    },
    stop(time) {
      output.gain.cancelScheduledValues(time);
      output.gain.setTargetAtTime(0.0001, time, 0.06);
      oscillators.forEach((node) => node.stop(time + 0.2));
      lfo.stop(time + 0.2);
    },
    update(nextControls) {
      output.gain.setTargetAtTime(nextControls.level * droneNormalization, audioContext.currentTime, 0.05);
      shaper.curve = createSoftClipCurve(nextControls.drive);
      lfo.frequency.setTargetAtTime(nextControls.lfoRate, audioContext.currentTime, 0.05);
      lfoGain.gain.setTargetAtTime(nextControls.lfoDepth, audioContext.currentTime, 0.05);
      filter.frequency.setTargetAtTime(nextControls.cutoff * 0.78 * nextControls.toneBrightness, audioContext.currentTime, 0.05);
      filter.Q.setTargetAtTime(nextControls.resonance * 0.75, audioContext.currentTime, 0.05);
    },
    setScanModulation(sample) {
      filter.detune.setTargetAtTime((sample.brightness - 0.5) * 480, audioContext.currentTime, 0.08);
      filter.Q.setTargetAtTime((controls.resonance * 0.55) + sample.contrast * 14, audioContext.currentTime, 0.08);
    },
  };
}

function createContinuousBed(audioContext, notes, controls, layer) {
  const output = audioContext.createGain();
  const shaper = audioContext.createWaveShaper();
  const panner = audioContext.createStereoPanner();
  const normalization = 1 / Math.sqrt(notes.length * 3);
  output.gain.value = controls.level * normalization * (layer === "bass" ? 0.52 : 0.42);
  shaper.curve = createSoftClipCurve(controls.drive + 0.8);
  shaper.oversample = "2x";

  const filter = audioContext.createBiquadFilter();
  filter.type = layer === "bass" ? "lowpass" : "bandpass";
  filter.frequency.value = controls.cutoff * controls.toneBrightness * (layer === "bass" ? 0.78 : 1.16);
  filter.Q.value = controls.resonance * (layer === "bass" ? 0.65 : 0.9);

  output.connect(shaper);
  shaper.connect(panner);
  panner.connect(filter);
  filter.connect(state.masterBus);

  const oscillators = notes.flatMap((note, index) => createBedOscillatorSet(audioContext, note, controls.voice, index, controls.spread));
  oscillators.forEach((node) => node.connect(output));

  return {
    start(time) {
      oscillators.forEach((node) => node.start(time));
    },
    stop(time) {
      output.gain.cancelScheduledValues(time);
      output.gain.setTargetAtTime(0.0001, time, 0.06);
      oscillators.forEach((node) => node.stop(time + 0.2));
    },
    update(nextControls) {
      output.gain.setTargetAtTime(nextControls.level * normalization * (layer === "bass" ? 0.52 : 0.42), audioContext.currentTime, 0.05);
      shaper.curve = createSoftClipCurve(nextControls.drive + 0.8);
      filter.frequency.setTargetAtTime(nextControls.cutoff * nextControls.toneBrightness * (layer === "bass" ? 0.78 : 1.16), audioContext.currentTime, 0.05);
      filter.Q.setTargetAtTime(nextControls.resonance * (layer === "bass" ? 0.65 : 0.9), audioContext.currentTime, 0.05);
    },
    setScanModulation(sample) {
      filter.detune.setTargetAtTime((sample.brightness - 0.5) * (layer === "bass" ? 280 : 620), audioContext.currentTime, 0.08);
      panner.pan.setTargetAtTime(clamp(sample.pan * controls.motion, -1, 1), audioContext.currentTime, 0.08);
    },
  };
}

function createBedOscillatorSet(audioContext, note, voice, index, spread) {
  const frequency = midiToFrequency(note);
  const recipes = voice === "Ritual Chorus"
    ? [
        { type: "sawtooth", ratio: 1, detune: -9 },
        { type: "sawtooth", ratio: 1.01, detune: 7 },
        { type: "triangle", ratio: 1.5, detune: 0 },
      ]
    : voice === "Gamelan Gong"
      ? [
          { type: "sine", ratio: 0.5, detune: -3 },
          { type: "sine", ratio: 0.76, detune: 0 },
          { type: "sine", ratio: 1.52, detune: 4 },
        ]
      : [
          { type: "sine", ratio: 1, detune: -4 },
          { type: "triangle", ratio: 1.19, detune: 3 },
          { type: "sine", ratio: 2.03, detune: 6 },
        ];

  return recipes.map((recipe, recipeIndex) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = recipe.type;
    oscillator.frequency.value = frequency * recipe.ratio;
    oscillator.detune.value = recipe.detune + centeredSpread(recipeIndex, recipes.length, spread) + index * 2;
    return oscillator;
  });
}

function createDroneOscillatorSet(audioContext, note, voice, index, spread = 0) {
  const frequency = midiToFrequency(note);
  const recipes = voice === "Bit Noise"
    ? [
        { type: "square", ratio: 1, detune: -2 + index },
        { type: "sine", ratio: 13, detune: 0 },
      ]
    : voice === "White Burst"
      ? [
          { type: "sine", ratio: 8, detune: -4 + index * 2 },
          { type: "sine", ratio: 16, detune: 3 - index },
        ]
    : voice === "Ritual Chorus"
    ? [
        { type: "sawtooth", ratio: 1, detune: -8 + index * 2 },
        { type: "sine", ratio: 2, detune: 6 - index * 2 },
      ]
    : voice === "Gamelan Gong"
      ? [
          { type: "sine", ratio: 0.5, detune: 0 },
          { type: "sine", ratio: 0.76, detune: 0 },
          { type: "sine", ratio: 1.04, detune: 0 },
        ]
      : [
          { type: "sine", ratio: 1, detune: -4 + index * 4 },
          { type: "triangle", ratio: 2, detune: 3 - index * 3 },
        ];

  return recipes.map((recipe, recipeIndex) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = recipe.type;
    oscillator.frequency.value = frequency * recipe.ratio;
    oscillator.detune.value = recipe.detune + centeredSpread(recipeIndex, recipes.length, spread);
    return oscillator;
  });
}

function centeredSpread(index, count, spread) {
  if (count <= 1 || spread === 0) return 0;
  const normalized = (index / (count - 1)) * 2 - 1;
  return normalized * spread;
}

function createFmSource(audioContext, frequency, time, slide, slideTime, lastFrequency) {
  const carrier = audioContext.createOscillator();
  const modulator = audioContext.createOscillator();
  const modGain = audioContext.createGain();
  carrier.type = "sine";
  modulator.type = "sine";
  modGain.gain.value = frequency * 1.8;
  setPitch(carrier.frequency, frequency, time, slide, slideTime, lastFrequency);
  setPitch(modulator.frequency, frequency * 2, time, slide, slideTime, lastFrequency * 2);
  modulator.connect(modGain);
  modGain.connect(carrier.frequency);
  return {
    output: carrier,
    start(startTime) {
      carrier.start(startTime);
      modulator.start(startTime);
    },
    stop(stopTime) {
      carrier.stop(stopTime);
      modulator.stop(stopTime);
    },
  };
}

function createFormantVoice(audioContext, frequency, time, slide, slideTime, lastFrequency, percussive, spread = 0) {
  const source = createLayeredOscillators(
    audioContext,
    [
      { type: percussive ? "square" : "sawtooth", ratio: 1, gain: 0.6 },
      { type: "sine", ratio: 2, gain: 0.2 },
    ],
    frequency,
    time,
    slide,
    slideTime,
    lastFrequency,
    spread,
  );
  const formantA = audioContext.createBiquadFilter();
  const formantB = audioContext.createBiquadFilter();
  formantA.type = "bandpass";
  formantB.type = "bandpass";
  formantA.frequency.value = percussive ? 700 : 800;
  formantB.frequency.value = percussive ? 1200 : 1400;
  formantA.Q.value = 8;
  formantB.Q.value = 10;
  source.output.connect(formantA);
  source.output.connect(formantB);
  const output = audioContext.createGain();
  formantA.connect(output);
  formantB.connect(output);
  return { ...source, output };
}

function setPitch(param, frequency, time, slide, slideTime, lastFrequency) {
  if (slide) {
    param.setValueAtTime(lastFrequency, time);
    param.linearRampToValueAtTime(frequency, time + slideTime);
  } else {
    param.setValueAtTime(frequency, time);
  }
}

function midiToFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

populatePresets();
bindControls();
syncLabels();
rebuildPattern();
loadDefaultCellImage();
