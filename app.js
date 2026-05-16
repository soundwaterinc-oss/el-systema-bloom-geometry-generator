const STEPS = 16;
const ROOT_MIDI = 36;

const rhythmPresets = {
  "Solid Drive": [1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1],
  Syncopated: [1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0],
  Gallop: [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1],
};

const scalePresets = {
  Minor: [0, 2, 3, 5, 7, 8, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Pentatonic: [0, 3, 5, 7, 10],
  Chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
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
    rings: 5,
    spokes: 13,
    polygonSides: 7,
    jitter: 0.18,
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
  scalePreset: document.querySelector("#scalePreset"),
  functionPreset: document.querySelector("#functionPreset"),
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
  fillSelect(elements.rhythmPreset, Object.keys(rhythmPresets), "Solid Drive");
  fillSelect(elements.scalePreset, Object.keys(scalePresets), "Minor");
  fillSelect(elements.functionPreset, Object.keys(functionPresets), "Orbit");
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

  ["rhythmPreset", "scalePreset", "functionPreset"].forEach((id) => {
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
    state.synth = createAcidBass(state.audioContext);
  }

  if (state.audioContext.state !== "running") {
    await state.audioContext.resume();
  }

  elements.audioToggle.textContent = "Audio Ready";
}

function toggleTransport() {
  if (!state.audioContext) {
    startAudio();
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
    };
  });
}

function normalizedStepValue(step, a, b) {
  const wave = Math.sin(step * 1.73 + a * Math.PI * 2) * 0.5 + 0.5;
  return (wave * 0.65) + (b * 0.35);
}

function drawGeometry() {
  const { width, height } = elements.canvas;
  const { rings, spokes, polygonSides, jitter } = state.geometrySeeds;

  ctx2d.clearRect(0, 0, width, height);
  ctx2d.fillStyle = "#0c1218";
  ctx2d.fillRect(0, 0, width, height);
  ctx2d.save();
  ctx2d.translate(width / 2, height / 2);

  const gradient = ctx2d.createRadialGradient(0, 0, 20, 0, 0, width * 0.45);
  gradient.addColorStop(0, "rgba(255, 179, 109, 0.12)");
  gradient.addColorStop(1, "rgba(12, 18, 24, 0)");
  ctx2d.fillStyle = gradient;
  ctx2d.beginPath();
  ctx2d.arc(0, 0, width * 0.42, 0, Math.PI * 2);
  ctx2d.fill();

  ctx2d.strokeStyle = "rgba(255, 122, 24, 0.9)";
  ctx2d.lineWidth = 1.5;

  for (let ring = 1; ring <= rings; ring += 1) {
    const radius = 34 + ring * 28;
    ctx2d.beginPath();
    for (let side = 0; side <= polygonSides; side += 1) {
      const angle = (side / polygonSides) * Math.PI * 2;
      const localJitter = 1 + Math.sin(side * 2.1 + ring) * jitter;
      const x = Math.cos(angle) * radius * localJitter;
      const y = Math.sin(angle) * radius * localJitter;
      if (side === 0) {
        ctx2d.moveTo(x, y);
      } else {
        ctx2d.lineTo(x, y);
      }
    }
    ctx2d.stroke();
  }

  ctx2d.strokeStyle = "rgba(141, 249, 168, 0.5)";
  for (let spoke = 0; spoke < spokes; spoke += 1) {
    const angle = (spoke / spokes) * Math.PI * 2;
    const radius = 170 + Math.cos(spoke * 1.9) * 22;
    ctx2d.beginPath();
    ctx2d.moveTo(0, 0);
    ctx2d.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    ctx2d.stroke();
  }

  ctx2d.restore();
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
      if (center > 34) {
        activePixels += 1;
      }

      const right = brightnessAt(x + 1, y);
      const down = brightnessAt(x, y + 1);
      const delta = Math.abs(center - right) + Math.abs(center - down);
      if (delta > 50) {
        edgePixels += 1;
      }
      if ((center > 28) !== (right > 28)) {
        transitions += 1;
      }
      if ((center > 28) !== (down > 28)) {
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
    rings: randomInt(4, 8),
    spokes: randomInt(9, 18),
    polygonSides: randomInt(5, 10),
    jitter: randomFloat(0.08, 0.32),
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

function createAcidBass(audioContext) {
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
      const oscillator = audioContext.createOscillator();
      oscillator.type = "sawtooth";

      const amp = audioContext.createGain();
      amp.gain.setValueAtTime(0.0001, time);

      const frequency = midiToFrequency(step.note);
      const attackGain = step.accent ? controls.accent + state.features.edgeDensity * 0.5 : 0.72;
      const noteLength = step.slide ? getStepDuration() + controls.slide : controls.decay;
      const targetCutoff = clamp(step.cutoff, 120, 4000);

      if (step.slide) {
        oscillator.frequency.setValueAtTime(lastFrequency, time);
        oscillator.frequency.linearRampToValueAtTime(frequency, time + controls.slide);
      } else {
        oscillator.frequency.setValueAtTime(frequency, time);
      }
      lastFrequency = frequency;

      filter.frequency.cancelScheduledValues(time);
      filter.Q.cancelScheduledValues(time);
      filter.frequency.setValueAtTime(targetCutoff * 0.65, time);
      filter.frequency.linearRampToValueAtTime(targetCutoff * (step.accent ? 1.25 : 1), time + 0.03);
      filter.frequency.exponentialRampToValueAtTime(Math.max(140, targetCutoff * 0.48), time + noteLength);
      filter.Q.setValueAtTime(controls.resonance, time);

      amp.gain.exponentialRampToValueAtTime(attackGain, time + 0.005);
      amp.gain.exponentialRampToValueAtTime(0.0001, time + noteLength);

      oscillator.connect(amp);
      amp.connect(filter);
      oscillator.start(time);
      oscillator.stop(time + noteLength + 0.04);
    },
  };
}

function midiToFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

populatePresets();
bindControls();
syncLabels();
rebuildPattern();
