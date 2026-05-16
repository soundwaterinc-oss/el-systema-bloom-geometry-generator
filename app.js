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
  "Pipe Organ": { label: "Pipe Organ" },
  "Fender Rhodes": { label: "Fender Rhodes" },
  Prophet: { label: "Prophet" },
  Noise: { label: "Noise" },
  "Sine Pure": { label: "Sine Pure" },
  "Sine Bell": { label: "Sine Bell" },
  "Sine FM": { label: "Sine FM" },
  Voice: { label: "Voice" },
  Kecak: { label: "Kecak" },
};

const visualPresets = {
  "Chevron Weave": "woven",
  "Star Lattice": "star",
  "Node Net": "nodes",
  "Cubic Weave": "cubes",
  "Brick Grid": "brick",
  "Plant Cell": "cell",
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
  synth: null,
  isPlaying: false,
  stepIndex: 0,
  nextStepTime: 0,
  schedulerId: null,
  currentPattern: [],
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
  mutateButton: document.querySelector("#mutateButton"),
  bpm: document.querySelector("#bpm"),
  bpmValue: document.querySelector("#bpmValue"),
  rhythmPreset: document.querySelector("#rhythmPreset"),
  voicePreset: document.querySelector("#voicePreset"),
  scalePreset: document.querySelector("#scalePreset"),
  functionPreset: document.querySelector("#functionPreset"),
  visualPreset: document.querySelector("#visualPreset"),
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
  densityValue: document.querySelector("#densityValue"),
  edgeDensityValue: document.querySelector("#edgeDensityValue"),
  complexityValue: document.querySelector("#complexityValue"),
  canvas: document.querySelector("#geometryCanvas"),
  stepGrid: document.querySelector("#stepGrid"),
};

const ctx2d = elements.canvas.getContext("2d");

function populatePresets() {
  fillSelect(elements.rhythmPreset, Object.keys(rhythmPresets), "Kecak Cycle");
  fillSelect(elements.voicePreset, Object.keys(voicePresets), "Acid Bass");
  fillSelect(elements.scalePreset, Object.keys(scalePresets), "Japanese In");
  fillSelect(elements.functionPreset, Object.keys(functionPresets), "Orbit");
  fillSelect(elements.visualPreset, Object.keys(visualPresets), "Chevron Weave");
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
  elements.mutateButton.addEventListener("click", () => {
    mutateGeometry();
    rebuildPattern();
  });

  ["bpm", "cutoff", "resonance", "decay", "accent", "slide"].forEach((id) => {
    elements[id].addEventListener("input", syncLabels);
  });

  ["rhythmPreset", "voicePreset", "scalePreset", "functionPreset", "visualPreset"].forEach((id) => {
    elements[id].addEventListener("change", rebuildPattern);
  });
}

function syncLabels() {
  elements.bpmValue.textContent = elements.bpm.value;
  elements.cutoffValue.textContent = elements.cutoff.value;
  elements.resonanceValue.textContent = Number(elements.resonance.value).toFixed(1);
  elements.decayValue.textContent = Number(elements.decay.value).toFixed(2);
  elements.accentValue.textContent = Number(elements.accent.value).toFixed(2);
  elements.slideValue.textContent = Number(elements.slide.value).toFixed(2);
}

async function startAudio() {
  if (!state.audioContext) {
    state.audioContext = new AudioContext();
    state.synth = createVoiceEngine(state.audioContext);
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
    state.schedulerId = window.setInterval(schedule, 25);
  } else {
    window.clearInterval(state.schedulerId);
    state.schedulerId = null;
    renderSteps();
  }
}

function schedule() {
  const lookAhead = 0.12;
  while (state.nextStepTime < state.audioContext.currentTime + lookAhead) {
    const step = state.currentPattern[state.stepIndex];
    if (step && step.active) {
      state.synth.play(step, state.nextStepTime, getSynthControls());
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
  };
}

function rebuildPattern() {
  drawGeometry();
  state.features = extractFeatures();
  state.currentPattern = buildPattern();
  syncFeatureLabels();
  renderSteps();
}

function buildPattern() {
  const rhythm = rhythmPresets[elements.rhythmPreset.value];
  const scale = scalePresets[elements.scalePreset.value];
  const fn = functionPresets[elements.functionPreset.value];
  const { density, edgeDensity, complexity } = state.features;
  const octaveOffset = density > 0.53 ? 12 : 0;

  return Array.from({ length: STEPS }, (_, step) => {
    const active = rhythm[step] === 1;
    const degreeIndex = fn(step, state.features) + Math.floor(density * 2.5) + (step % 3 === 0 ? 1 : 0);
    const scaleNote = scale[((degreeIndex % scale.length) + scale.length) % scale.length];
    const accentThreshold = 0.28 + edgeDensity * 0.42;
    const slideThreshold = 0.35 + complexity * 0.32;
    const accent = active && normalizedStepValue(step, density, edgeDensity) > accentThreshold;
    const slide = active && normalizedStepValue(step, complexity, density) > slideThreshold;
    const cutoffMod = Math.round(220 + complexity * 500 + edgeDensity * 420 + (step % 4) * 35);

    return {
      active,
      accent,
      slide,
      cutoff: Number(elements.cutoff.value) + cutoffMod,
      note: ROOT_MIDI + scaleNote + octaveOffset,
      voice: elements.voicePreset.value,
    };
  });
}

function normalizedStepValue(step, a, b) {
  const wave = Math.sin(step * 1.73 + a * Math.PI * 2) * 0.5 + 0.5;
  return (wave * 0.65) + (b * 0.35);
}

function drawGeometry() {
  switch (visualPresets[elements.visualPreset.value]) {
    case "star":
      drawStarLattice();
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
    case "cell":
      drawPlantCells();
      break;
    case "woven":
    default:
      drawWovenGeometry();
      break;
  }
}

function drawWovenGeometry() {
  const { width, height } = elements.canvas;
  const { lanes, spacing, angleShift } = state.geometrySeeds;

  ctx2d.clearRect(0, 0, width, height);
  ctx2d.fillStyle = "#f5f3ee";
  ctx2d.fillRect(0, 0, width, height);
  ctx2d.strokeStyle = "#121212";
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

  ctx2d.strokeStyle = "#f5f3ee";
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

function drawStarLattice() {
  const { width, height } = elements.canvas;
  ctx2d.clearRect(0, 0, width, height);
  ctx2d.fillStyle = "#f7f5ef";
  ctx2d.fillRect(0, 0, width, height);
  ctx2d.strokeStyle = "#111";
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

function syncFeatureLabels() {
  elements.densityValue.textContent = state.features.density.toFixed(2);
  elements.edgeDensityValue.textContent = state.features.edgeDensity.toFixed(2);
  elements.complexityValue.textContent = state.features.complexity.toFixed(2);
}

function renderSteps(currentStep = -1) {
  elements.stepGrid.innerHTML = "";

  state.currentPattern.forEach((step, index) => {
    const item = document.createElement("div");
    item.className = "step";
    if (!step.active) item.classList.add("is-rest");
    if (step.accent) item.classList.add("is-accent");
    if (step.slide) item.classList.add("is-slide");
    if (index === currentStep) item.classList.add("is-current");

    item.innerHTML = `
      <small>Step ${index + 1}</small>
      <strong>${step.active ? midiToNote(step.note) : "Rest"}</strong>
      <small>${step.active ? `${step.accent ? "Accent " : ""}${step.slide ? "Slide " : ""}Cut ${Math.round(step.cutoff)}` : "Muted"}</small>
    `;
    elements.stepGrid.appendChild(item);
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

function createVoiceEngine(audioContext) {
  const filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  filter.Q.value = 12;

  const output = audioContext.createGain();
  output.gain.value = 0.7;
  filter.connect(output);
  output.connect(audioContext.destination);

  let lastFrequency = 110;

  return {
    play(step, time, controls) {
      const frequency = midiToFrequency(step.note);
      const attackGain = step.accent ? controls.accent + state.features.edgeDensity * 0.5 : 0.72;
      const noteLength = step.slide ? getStepDuration() + controls.slide : controls.decay;
      const targetCutoff = clamp(step.cutoff, 120, 4000);

      filter.frequency.cancelScheduledValues(time);
      filter.Q.cancelScheduledValues(time);
      filter.frequency.setValueAtTime(targetCutoff * 0.65, time);
      filter.frequency.linearRampToValueAtTime(targetCutoff * (step.accent ? 1.25 : 1), time + 0.03);
      filter.frequency.exponentialRampToValueAtTime(Math.max(140, targetCutoff * 0.48), time + noteLength);
      filter.Q.setValueAtTime(controls.resonance, time);

      const source = createVoiceSource(audioContext, step.voice, frequency, time, noteLength, step.slide, controls.slide, lastFrequency);
      const amp = audioContext.createGain();
      amp.gain.setValueAtTime(0.0001, time);
      amp.gain.exponentialRampToValueAtTime(attackGain, time + 0.005);
      amp.gain.exponentialRampToValueAtTime(0.0001, time + noteLength);
      source.output.connect(amp);
      amp.connect(filter);
      source.start(time);
      source.stop(time + noteLength + 0.05);
      lastFrequency = frequency;
    },
  };
}

function createVoiceSource(audioContext, voice, frequency, time, noteLength, slide, slideTime, lastFrequency) {
  switch (voice) {
    case "Pipe Organ":
      return createLayeredOscillators(audioContext, [
        { type: "sine", ratio: 1, gain: 0.7 },
        { type: "sine", ratio: 2, gain: 0.35 },
        { type: "sine", ratio: 3, gain: 0.18 },
      ], frequency, time, slide, slideTime, lastFrequency);
    case "Fender Rhodes":
      return createLayeredOscillators(audioContext, [
        { type: "sine", ratio: 1, gain: 0.75 },
        { type: "sine", ratio: 2.01, gain: 0.24 },
        { type: "triangle", ratio: 4, gain: 0.08 },
      ], frequency, time, slide, slideTime, lastFrequency);
    case "Prophet":
      return createLayeredOscillators(audioContext, [
        { type: "sawtooth", ratio: 1, gain: 0.55 },
        { type: "sawtooth", ratio: 1.01, gain: 0.45 },
      ], frequency, time, slide, slideTime, lastFrequency);
    case "Noise":
      return createNoiseSource(audioContext, noteLength);
    case "Sine Pure":
      return createLayeredOscillators(audioContext, [{ type: "sine", ratio: 1, gain: 1 }], frequency, time, slide, slideTime, lastFrequency);
    case "Sine Bell":
      return createLayeredOscillators(audioContext, [
        { type: "sine", ratio: 1, gain: 0.7 },
        { type: "sine", ratio: 2.7, gain: 0.2 },
        { type: "sine", ratio: 4.1, gain: 0.12 },
      ], frequency, time, slide, slideTime, lastFrequency);
    case "Sine FM":
      return createFmSource(audioContext, frequency, time, slide, slideTime, lastFrequency);
    case "Voice":
      return createFormantVoice(audioContext, frequency, time, slide, slideTime, lastFrequency, false);
    case "Kecak":
      return createFormantVoice(audioContext, frequency * 1.5, time, false, 0, lastFrequency, true);
    case "Acid Bass":
    default:
      return createLayeredOscillators(audioContext, [{ type: "sawtooth", ratio: 1, gain: 1 }], frequency, time, slide, slideTime, lastFrequency);
  }
}

function createLayeredOscillators(audioContext, layers, frequency, time, slide, slideTime, lastFrequency) {
  const output = audioContext.createGain();
  const nodes = layers.map((layer) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = layer.type;
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

function createFormantVoice(audioContext, frequency, time, slide, slideTime, lastFrequency, percussive) {
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
