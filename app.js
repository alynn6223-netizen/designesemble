const state = {
  profile: {
    name: "아린",
    grade: "2",
    studentId: "20241234",
    age: "21",
    major: "모션그래픽"
  },
  avatar: {
    animal: "cat",
    accessory: "none",
    color: "#276ef1"
  },
  currentWorldId: "world-portfolio",
  tool: "select",
  player: { x: 480, y: 480 },
  worlds: [
    {
      id: "world-portfolio",
      title: "2학년 포트폴리오 정보 보드",
      purpose: "비교과 추천",
      gradeLimit: "2",
      canvasType: "iso",
      bgColor: "#bfeefa",
      strokes: [],
      blocks: []
    },
    {
      id: "world-class",
      title: "이번 주 수업 공지",
      purpose: "수업 공지",
      gradeLimit: "all",
      canvasType: "flat",
      bgColor: "#ffffff",
      strokes: [],
      blocks: []
    }
  ]
};

const blockTypes = [
  {
    type: "meet",
    title: "일정 취합 블럭",
    description: "가능한 시간을 빠르게 표시해요.",
    hue: 140
  },
  {
    type: "activity",
    title: "비교과 추천 블럭",
    description: "마감일과 관련 분야를 함께 정리해요.",
    hue: 204
  },
  {
    type: "study",
    title: "스터디 모집 블럭",
    description: "인원, 활동 내용, 해시태그를 모아요.",
    hue: 268
  },
  {
    type: "exhibit",
    title: "전시회 관람팟 모집",
    description: "일정, 장소, 만남 정보를 공유해요.",
    hue: 36
  },
  {
    type: "qa",
    title: "Q&A",
    description: "파일, 링크, 답변 댓글을 남겨요.",
    hue: 0
  }
];

const board = document.querySelector("#board");
const canvasFrame = document.querySelector("#canvasFrame");
const inkCanvas = document.querySelector("#inkCanvas");
const player = document.querySelector("#player");
const chatBubble = document.querySelector("#chatBubble");
const edgeBubble = document.querySelector("#edgeBubble");
const worldList = document.querySelector("#worldList");
const worldTitle = document.querySelector("#worldTitle");
const worldPurpose = document.querySelector("#worldPurpose");
const avatarPreview = document.querySelector("#avatarPreview");
const blockDialog = document.querySelector("#blockDialog");
const worldDialog = document.querySelector("#worldDialog");
const blockOptions = document.querySelector("#blockOptions");

let selectedBlockId = null;
let dragTarget = null;
let dragElement = null;
let dragOffset = { x: 0, y: 0 };
let isDrawing = false;
let inkContext;
let activeStroke = null;
let lastFrameTime = 0;
const pressedKeys = new Set();

const userColors = ["#276ef1", "#e04f5f", "#20a464", "#8b5cf6", "#f59e0b", "#06a7b3"];

const animalPresets = {
  dog: { fur: "#c48952", snout: "#f1d7b8", leg: "#74482d", tail: "#b87642" },
  cat: { fur: "#f3b36a", snout: "#ffe3bd", leg: "#a86d3c", tail: "#f3b36a" },
  rabbit: { fur: "#f1d8dc", snout: "#fff5f6", leg: "#d9aab4", tail: "#ffffff" },
  bear: { fur: "#ad7c52", snout: "#e3c2a2", leg: "#6f4a30", tail: "#8f623f" },
  squirrel: { fur: "#c66b32", snout: "#f0c29c", leg: "#7a3f22", tail: "#a95227" },
  parrot: { fur: "#45b66a", snout: "#ffe27a", leg: "#e2762d", tail: "#276ef1" },
  pigeon: { fur: "#9aa1aa", snout: "#e6e9ef", leg: "#d97d6c", tail: "#737b86" },
  snake: { fur: "#55b961", snout: "#d8ffd6", leg: "#55b961", tail: "#3c9446" },
  hamster: { fur: "#d79a5f", snout: "#ffe3c5", leg: "#a2653a", tail: "#f5c99c" },
  raccoon: { fur: "#7c858d", snout: "#e7eaee", leg: "#4d555d", tail: "#59636c" }
};

function currentWorld() {
  return state.worlds.find((world) => world.id === state.currentWorldId);
}

function save() {
  localStorage.setItem("vd-commons-state", JSON.stringify(state));
}

function load() {
  const saved = localStorage.getItem("vd-commons-state");
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    Object.assign(state, parsed);
    state.worlds.forEach((world) => {
      if (!world.bgColor) world.bgColor = world.canvasType === "iso" ? "#bfeefa" : "#ffffff";
      if (!world.strokes) world.strokes = [];
      world.blocks.forEach((block) => {
        if (!block.plane) block.plane = "free";
        if (!block.opacity) block.opacity = 1;
        if (typeof block.textEditing !== "boolean") block.textEditing = false;
        if (typeof block.showEditor !== "boolean") block.showEditor = false;
      });
    });
    if (!animalPresets[state.avatar.animal]) state.avatar.animal = "cat";
    if (!state.avatar.color) state.avatar.color = pickUserColor(state.profile.studentId || state.profile.name);
  } catch {
    localStorage.removeItem("vd-commons-state");
  }
}

function pickUserColor(seed) {
  const text = String(seed || "vd");
  const sum = Array.from(text).reduce((total, char) => total + char.charCodeAt(0), 0);
  return userColors[sum % userColors.length];
}

function avatarMarkup(animal = state.avatar.animal, accessory = state.avatar.accessory) {
  const colors = animalPresets[animal] || animalPresets.cat;
  const accessoryMarkup = {
    none: "",
    cap: '<span class="voxel-hat"></span>',
    ribbon: '<span class="voxel-ribbon"></span>',
    glasses: '<span class="voxel-glasses"></span>'
  };
  return `
    <div class="voxel-character ${animal}" style="--fur:${colors.fur};--snout:${colors.snout};--leg:${colors.leg};--tail:${colors.tail};--user-color:${state.avatar.color}">
      <span class="voxel-part voxel-tail"></span>
      <span class="voxel-part voxel-leg front"></span>
      <span class="voxel-part voxel-leg back"></span>
      <span class="voxel-part voxel-body"></span>
      <span class="voxel-part voxel-ear left"></span>
      <span class="voxel-part voxel-ear right"></span>
      <span class="voxel-part voxel-head"></span>
      <span class="voxel-part voxel-snout"></span>
      <span class="voxel-part voxel-beak"></span>
      <span class="voxel-eye left"></span>
      <span class="voxel-eye right"></span>
      ${accessoryMarkup[accessory] || ""}
    </div>
  `;
}

function renderAvatar() {
  avatarPreview.innerHTML = avatarMarkup();
  player.innerHTML = avatarMarkup();
  player.style.setProperty("--user-color", state.avatar.color);
  chatBubble.style.setProperty("--user-color", state.avatar.color);
  edgeBubble.style.setProperty("--user-color", state.avatar.color);
  chatBubble.classList.add("user-colored");
  edgeBubble.classList.add("user-colored");
}

function renderWorlds() {
  worldList.innerHTML = "";
  state.worlds.forEach((world) => {
    const locked = world.gradeLimit !== "all" && world.gradeLimit !== state.profile.grade;
    const item = document.createElement("button");
    item.className = `world-item ${world.id === state.currentWorldId ? "active" : ""} ${locked ? "locked" : ""}`;
    item.innerHTML = `
      <strong>${world.title}</strong>
      <span class="meta">${world.purpose} · ${world.gradeLimit === "all" ? "전체" : `${world.gradeLimit}학년 전용`}</span>
    `;
    item.addEventListener("click", () => {
      if (locked) {
        showEdgeBubble("이 월드는 해당 학년만 입장할 수 있어요.", "left");
        return;
      }
      state.currentWorldId = world.id;
      selectedBlockId = null;
      render();
      save();
    });
    worldList.appendChild(item);
  });
}

function renderBlocks() {
  board.innerHTML = "";
  currentWorld().blocks.forEach((block) => {
    const card = document.createElement("article");
    card.className = `info-block plane-${block.plane || "free"} ${selectedBlockId === block.id ? "selected" : ""}`;
    card.dataset.id = block.id;
    card.style.left = `${block.x}px`;
    card.style.top = `${block.y}px`;
    card.style.width = `${block.width}px`;
    card.style.minHeight = `${block.height}px`;
    card.style.opacity = block.opacity || 1;
    card.style.setProperty("--block-font", `${block.fontSize || 16}px`);
    card.style.setProperty("--block-bg", `hsl(${block.hue} 100% 96%)`);
    card.style.setProperty("--block-border", `hsl(${block.hue} 100% 82%)`);
    card.innerHTML = blockTemplate(block);
    board.appendChild(card);
  });
}

function blockTemplate(block) {
  const isOwner = block.owner === state.profile.name;
  const isEditing = isOwner && block.textEditing;
  const ownerTools = isOwner ? `
    <div class="owner-tools" aria-label="작성자 편집 도구">
      <button class="corner-tool ${isEditing ? "active" : ""}" data-action="toggle-text-edit" title="수정">✎</button>
      <button class="corner-edit ${block.showEditor ? "active" : ""}" data-action="toggle-editor">편집</button>
    </div>
  ` : "";
  const editorPanel = isOwner && block.showEditor ? `
    <div class="layout-editor">
      <label>너비 <input type="range" min="240" max="620" value="${block.width}" data-size-field="width"></label>
      <label>높이 <input type="range" min="180" max="520" value="${block.height}" data-size-field="height"></label>
      <label>투명도 <input type="range" min="35" max="100" value="${Math.round((block.opacity || 1) * 100)}" data-size-field="opacity"></label>
    </div>
  ` : "";
  const planeControls = `
    <div class="plane-controls" aria-label="붙일 면 선택">
      ${[
        ["free", "자유"],
        ["floor", "바닥"],
        ["wall-left", "왼벽"],
        ["wall-right", "오른벽"]
      ].map(([plane, label]) => `<button data-plane="${plane}" class="${(block.plane || "free") === plane ? "active" : ""}">${label}</button>`).join("")}
    </div>
  `;
  const header = `
    ${ownerTools}
    <div class="block-header">
      <div>
        <h3 contenteditable="${isEditing}" data-field="title">${block.title}</h3>
        <p class="meta">${block.owner} 생성 · 참여 ${block.participants.length}명</p>
      </div>
      <span class="block-tag">${block.label}</span>
    </div>
  `;

  const actions = `
    <div class="block-actions">
      <button class="ghost-button" data-action="join">참여하기</button>
      <button class="ghost-button" data-action="comment">댓글 달기</button>
      ${isOwner ? '<button class="ghost-button" data-action="delete">삭제</button>' : ""}
    </div>
  `;

  return `${header}${editorPanel}${planeControls}<div class="block-body">${blockBody(block)}</div>${actions}`;
}

function blockBody(block) {
  if (block.type === "meet") {
    return `
      <div class="meet-grid">
        ${["월", "화", "수", "목", "금", "토", "일"].map((day) => `<button>${day}</button>`).join("")}
        ${["10", "12", "14", "16", "18", "20", "22"].map((time, index) => `<button class="${index % 2 ? "active" : ""}">${time}시</button>`).join("")}
      </div>
      <div class="comment-box"><p>민지: 수요일 18시 이후 가능</p><p>도윤: 금요일은 전부 가능</p></div>
    `;
  }

  if (block.type === "activity") {
    return `
      <label>추천 종류<select><option>공모전</option><option selected>대외활동</option><option>워크샵</option><option>특강</option></select></label>
      <label>관련 분야<input value="모션그래픽, 브랜딩"></label>
      <label>마감일<input type="date" value="2026-06-18"></label>
      <label>추천 이유<textarea>팀 프로젝트 경험을 포트폴리오로 정리하기 좋아요.</textarea></label>
      <div class="calendar-grid">${Array.from({ length: 14 }, (_, i) => `<span>${i + 1}</span>`).join("")}</div>
    `;
  }

  if (block.type === "study") {
    return `
      <div class="mini-row"><span>모집 인원</span><select><option>2명</option><option selected>4명</option><option>6명</option></select></div>
      <label>활동 내용<textarea>After Effects 포트폴리오 컷 편집 스터디</textarea></label>
      <label>모집 분야<input value="#모션그래픽 #편집 #포트폴리오"></label>
      <label>단톡방 링크<input value="https://open.kakao.com/..."></label>
    `;
  }

  if (block.type === "exhibit") {
    return `
      <label>전시 정보<textarea>서울시립미술관 디자인 특별전 / 6.12-7.20 / 시청역</textarea></label>
      <label>모집 인원<input value="4명"></label>
      <label>만남 장소 및 시간<textarea>6월 15일 오후 2시, 시청역 10번 출구</textarea></label>
    `;
  }

  if (block.type === "image") {
    return `
      <img alt="${block.title}" src="${block.src}" style="width:100%;height:auto;border-radius:6px">
      <p class="meta">드래그 앤 드롭으로 추가한 이미지입니다. 카드 오른쪽 아래를 잡아 크기를 조절할 수 있어요.</p>
    `;
  }

  return `
    <label>질문<textarea>팀 프로젝트에서 쓸 무료 사운드 소스 추천 받을 수 있을까요?</textarea></label>
    <label>파일 및 링크<input value="https://example.com/reference"></label>
    <div class="comment-box"><p>서연: Freesound는 라이선스 확인하면 좋아요.</p><p>준호: 학교 라이브러리도 확인해봐요.</p></div>
  `;
}

function addBlock(type) {
  const spec = blockTypes.find((item) => item.type === type);
  const block = {
    id: `block-${Date.now()}`,
    type,
    title: spec.title,
    label: currentWorld().purpose,
    owner: state.profile.name,
    participants: [],
    hue: spec.hue,
    x: 130 + currentWorld().blocks.length * 34,
    y: 110 + currentWorld().blocks.length * 28,
    width: 310,
    height: 230,
    opacity: 1,
    textEditing: false,
    showEditor: false,
    fontSize: Number(document.querySelector("#fontSize").value),
    plane: "free"
  };
  currentWorld().blocks.push(block);
  selectedBlockId = block.id;
  renderBlocks();
  save();
}

function renderBlockOptions() {
  blockOptions.innerHTML = "";
  blockTypes.forEach((type) => {
    const option = document.createElement("button");
    option.className = "block-option";
    option.style.background = `hsl(${type.hue} 100% 96%)`;
    option.style.borderColor = `hsl(${type.hue} 100% 82%)`;
    option.innerHTML = `<strong>${type.title}</strong><span>${type.description}</span>`;
    option.addEventListener("click", () => {
      addBlock(type.type);
      blockDialog.close();
    });
    blockOptions.appendChild(option);
  });
}

function renderWorldHeader() {
  const world = currentWorld();
  worldTitle.textContent = world.title;
  worldPurpose.textContent = world.purpose;
  canvasFrame.classList.toggle("iso", world.canvasType === "iso");
  const frameBg = world.canvasType === "iso" ? world.bgColor || "#bfeefa" : "#ffffff";
  canvasFrame.style.setProperty("--world-bg", frameBg);
  document.querySelector("#backgroundColor").value = world.bgColor || (world.canvasType === "iso" ? "#bfeefa" : "#ffffff");
  document.querySelector("#backgroundColor").disabled = world.canvasType !== "iso";
}

function renderPlayer() {
  player.style.left = `${state.player.x}px`;
  player.style.top = `${state.player.y}px`;
  const depthScale = 0.82 + (state.player.y / 980) * 0.24;
  player.style.transform = `translate(-50%, -50%) scale(${depthScale.toFixed(3)})`;
  player.style.zIndex = String(5 + Math.round(state.player.y));
  positionChatBubble();
}

function animateMovement(timestamp = 0) {
  const delta = Math.min(32, timestamp - lastFrameTime || 16) / 1000;
  lastFrameTime = timestamp;
  let dx = 0;
  let dy = 0;
  if (pressedKeys.has("ArrowLeft")) dx -= 1;
  if (pressedKeys.has("ArrowRight")) dx += 1;
  if (pressedKeys.has("ArrowUp")) dy -= 0.82;
  if (pressedKeys.has("ArrowDown")) dy += 0.82;

  if (dx || dy) {
    const length = Math.hypot(dx, dy) || 1;
    const speed = pressedKeys.has("Shift") ? 290 : 190;
    state.player.x = Math.max(30, Math.min(1560, state.player.x + (dx / length) * speed * delta));
    state.player.y = Math.max(40, Math.min(940, state.player.y + (dy / length) * speed * delta));
    player.classList.add("walking");
    player.classList.toggle("facing-left", dx < 0);
    renderPlayer();
  } else {
    player.classList.remove("walking");
  }
  requestAnimationFrame(animateMovement);
}

function syncControls() {
  document.querySelector("#nameInput").value = state.profile.name;
  document.querySelector("#gradeInput").value = state.profile.grade;
  document.querySelector("#studentIdInput").value = state.profile.studentId;
  document.querySelector("#ageInput").value = state.profile.age;
  document.querySelector("#majorInput").value = state.profile.major;
  document.querySelectorAll("#animalPicker button").forEach((button) => {
    button.classList.toggle("active", button.dataset.animal === state.avatar.animal);
  });
  document.querySelectorAll("#accessoryPicker button").forEach((button) => {
    button.classList.toggle("active", button.dataset.accessory === state.avatar.accessory);
  });
}

function render() {
  syncControls();
  renderAvatar();
  renderWorldHeader();
  renderWorlds();
  renderBlocks();
  renderPlayer();
  resizeInkCanvas();
}

function selectBlock(id) {
  selectedBlockId = id;
  renderBlocks();
}

function findBlock(id) {
  return currentWorld().blocks.find((block) => block.id === id);
}

function setTool(tool) {
  const inkTools = ["draw", "erase-pixel", "erase-stroke"];
  state.tool = tool;
  document.querySelector("#selectTool").classList.toggle("active", tool === "select");
  document.querySelector("#drawTool").classList.toggle("active", tool === "draw");
  document.querySelector("#pixelEraseTool").classList.toggle("active", tool === "erase-pixel");
  document.querySelector("#strokeEraseTool").classList.toggle("active", tool === "erase-stroke");
  inkCanvas.classList.toggle("drawing", inkTools.includes(tool));
}

function resizeInkCanvas() {
  const rect = canvasFrame.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  inkCanvas.width = Math.floor(rect.width * dpr);
  inkCanvas.height = Math.floor(rect.height * dpr);
  inkCanvas.style.width = `${rect.width}px`;
  inkCanvas.style.height = `${rect.height}px`;
  inkContext = inkCanvas.getContext("2d");
  inkContext.scale(dpr, dpr);
  inkContext.lineCap = "round";
  inkContext.lineJoin = "round";
  redrawInk();
}

function redrawInk() {
  if (!inkContext) return;
  inkContext.clearRect(0, 0, inkCanvas.width, inkCanvas.height);
  currentWorld().strokes.forEach((stroke) => drawStoredStroke(stroke));
}

function drawStoredStroke(stroke) {
  if (!stroke.points.length) return;
  inkContext.save();
  inkContext.globalCompositeOperation = stroke.mode === "erase-pixel" ? "destination-out" : "source-over";
  inkContext.strokeStyle = stroke.color;
  inkContext.lineWidth = stroke.size;
  inkContext.beginPath();
  inkContext.moveTo(stroke.points[0].x, stroke.points[0].y);
  stroke.points.slice(1).forEach((point) => inkContext.lineTo(point.x, point.y));
  inkContext.stroke();
  inkContext.restore();
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function eraseStrokeAt(point) {
  const size = Number(document.querySelector("#brushSize").value);
  const before = currentWorld().strokes.length;
  currentWorld().strokes = currentWorld().strokes.filter((stroke) => {
    if (stroke.mode !== "draw") return true;
    for (let index = 1; index < stroke.points.length; index += 1) {
      if (distanceToSegment(point, stroke.points[index - 1], stroke.points[index]) <= size + stroke.size / 2) return false;
    }
    return true;
  });
  if (currentWorld().strokes.length !== before) {
    redrawInk();
    save();
  }
}

function isInteractiveBlockTarget(target) {
  return !!target.closest("button, input, textarea, select, label, [contenteditable='true'], .layout-editor, .plane-controls, .block-actions, .owner-tools");
}

function pointerPoint(event) {
  const rect = canvasFrame.getBoundingClientRect();
  return {
    x: event.clientX - rect.left + canvasFrame.scrollLeft,
    y: event.clientY - rect.top + canvasFrame.scrollTop
  };
}

function inPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects = yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function isoSurfaces() {
  return {
    floor: [
      { x: 770, y: 420 },
      { x: 1080, y: 575 },
      { x: 770, y: 730 },
      { x: 460, y: 575 }
    ],
    "wall-left": [
      { x: 770, y: 180 },
      { x: 770, y: 421 },
      { x: 460, y: 575 },
      { x: 460, y: 334 }
    ],
    "wall-right": [
      { x: 770, y: 180 },
      { x: 1080, y: 334 },
      { x: 1080, y: 575 },
      { x: 770, y: 421 }
    ]
  };
}

function detectIsoSurface(point) {
  if (currentWorld().canvasType !== "iso") return "free";
  const surfaces = isoSurfaces();
  if (inPolygon(point, surfaces["wall-left"])) return "wall-left";
  if (inPolygon(point, surfaces["wall-right"])) return "wall-right";
  if (inPolygon(point, surfaces.floor)) return "floor";
  return "free";
}

function blockCenter(block) {
  return {
    x: block.x + block.width / 2,
    y: block.y + block.height / 2
  };
}

function planeClass(plane) {
  return `plane-${plane || "free"}`;
}

function updateBlockPlaneElement(element, plane) {
  ["plane-free", "plane-floor", "plane-wall-left", "plane-wall-right"].forEach((className) => {
    element.classList.remove(className);
  });
  element.classList.add(planeClass(plane));
}

function isInsideDrawableCanvas(point) {
  if (currentWorld().canvasType !== "iso") {
    return point.x >= 0 && point.x <= canvasFrame.clientWidth && point.y >= 0 && point.y <= canvasFrame.clientHeight;
  }
  const surfaces = isoSurfaces();
  return Object.values(surfaces).some((polygon) => inPolygon(point, polygon));
}

function positionChatBubble() {
  if (chatBubble.classList.contains("hidden")) return;
  chatBubble.style.left = `${state.player.x + 24}px`;
  chatBubble.style.top = `${state.player.y - 76}px`;
}

function showBubble(message) {
  chatBubble.textContent = message;
  chatBubble.classList.remove("hidden");
  positionChatBubble();
  window.clearTimeout(showBubble.timeout);
  showBubble.timeout = window.setTimeout(() => chatBubble.classList.add("hidden"), 3600);
}

function showEdgeBubble(message, side = "right") {
  edgeBubble.textContent = message;
  edgeBubble.classList.remove("hidden");
  edgeBubble.style.top = "42%";
  edgeBubble.style.left = side === "left" ? "18px" : "auto";
  edgeBubble.style.right = side === "right" ? "18px" : "auto";
  window.clearTimeout(showEdgeBubble.timeout);
  showEdgeBubble.timeout = window.setTimeout(() => edgeBubble.classList.add("hidden"), 3600);
}

function createWorld() {
  const title = document.querySelector("#worldNameInput").value.trim() || "새 정보 월드";
  const purpose = document.querySelector("#purposeInput").value;
  const gradeLimit = document.querySelector("#gradeLimitInput").value;
  const canvasType = document.querySelector("#canvasTypeInput").value;
  const bgColor = document.querySelector("#newWorldBackgroundInput").value;
  const world = {
    id: `world-${Date.now()}`,
    title,
    purpose,
    gradeLimit,
    canvasType,
    bgColor,
    strokes: [],
    blocks: []
  };
  state.worlds.push(world);
  state.currentWorldId = world.id;
  render();
  save();
}

function updateProfileFromInputs() {
  state.profile = {
    name: document.querySelector("#nameInput").value.trim() || "익명",
    grade: document.querySelector("#gradeInput").value,
    studentId: document.querySelector("#studentIdInput").value.trim(),
    age: document.querySelector("#ageInput").value,
    major: document.querySelector("#majorInput").value.trim()
  };
  state.avatar.color = pickUserColor(state.profile.studentId || state.profile.name);
  renderAvatar();
  renderWorlds();
  save();
  showBubble(`${state.profile.name} 정보가 저장됐어요.`);
}

function setupEvents() {
  document.querySelector("#saveProfile").addEventListener("click", updateProfileFromInputs);
  document.querySelector("#addBlock").addEventListener("click", () => blockDialog.showModal());
  document.querySelector("#newWorld").addEventListener("click", () => worldDialog.showModal());
  document.querySelector("#createWorld").addEventListener("click", createWorld);
  document.querySelector("#selectTool").addEventListener("click", () => setTool("select"));
  document.querySelector("#drawTool").addEventListener("click", () => setTool("draw"));
  document.querySelector("#pixelEraseTool").addEventListener("click", () => setTool("erase-pixel"));
  document.querySelector("#strokeEraseTool").addEventListener("click", () => setTool("erase-stroke"));
  document.querySelector("#clearInk").addEventListener("click", () => {
    currentWorld().strokes = [];
    redrawInk();
    save();
  });
  document.querySelector("#backgroundColor").addEventListener("input", (event) => {
    if (currentWorld().canvasType !== "iso") return;
    currentWorld().bgColor = event.target.value;
    canvasFrame.style.setProperty("--world-bg", event.target.value);
    save();
  });

  document.querySelector("#fontSize").addEventListener("input", (event) => {
    if (!selectedBlockId) return;
    const block = findBlock(selectedBlockId);
    block.fontSize = Number(event.target.value);
    renderBlocks();
    save();
  });

  document.querySelector("#animalPicker").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    state.avatar.animal = button.dataset.animal;
    document.querySelectorAll("#animalPicker button").forEach((item) => item.classList.toggle("active", item === button));
    renderAvatar();
    save();
  });

  document.querySelector("#accessoryPicker").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    state.avatar.accessory = button.dataset.accessory;
    document.querySelectorAll("#accessoryPicker button").forEach((item) => item.classList.toggle("active", item === button));
    renderAvatar();
    save();
  });

  board.addEventListener("pointerdown", (event) => {
    const card = event.target.closest(".info-block");
    if (!card || state.tool !== "select") return;
    selectBlock(card.dataset.id);
    if (isInteractiveBlockTarget(event.target)) return;
    const block = findBlock(card.dataset.id);
    const point = pointerPoint(event);
    dragTarget = block;
    dragElement = card;
    dragOffset = { x: point.x - block.x, y: point.y - block.y };
    card.setPointerCapture(event.pointerId);
  });

  board.addEventListener("pointermove", (event) => {
    if (!dragTarget) return;
    const point = pointerPoint(event);
    dragTarget.x = Math.max(12, point.x - dragOffset.x);
    dragTarget.y = Math.max(12, point.y - dragOffset.y);
    if (currentWorld().canvasType === "iso") {
      dragTarget.plane = detectIsoSurface(blockCenter(dragTarget));
    }
    if (dragElement) {
      dragElement.style.left = `${dragTarget.x}px`;
      dragElement.style.top = `${dragTarget.y}px`;
      updateBlockPlaneElement(dragElement, dragTarget.plane);
    }
  });

  board.addEventListener("pointerup", () => {
    if (!dragTarget) return;
    if (currentWorld().canvasType === "iso") {
      dragTarget.plane = detectIsoSurface(blockCenter(dragTarget));
      renderBlocks();
    }
    dragTarget = null;
    dragElement = null;
    save();
  });

  board.addEventListener("click", (event) => {
    const toolButton = event.target.closest("[data-action='toggle-text-edit'], [data-action='toggle-editor']");
    if (toolButton) {
      const card = event.target.closest(".info-block");
      const block = findBlock(card.dataset.id);
      if (block.owner !== state.profile.name) return;
      if (toolButton.dataset.action === "toggle-text-edit") {
        block.textEditing = !block.textEditing;
      }
      if (toolButton.dataset.action === "toggle-editor") {
        block.showEditor = !block.showEditor;
      }
      selectedBlockId = block.id;
      renderBlocks();
      save();
      return;
    }

    const planeButton = event.target.closest("[data-plane]");
    if (planeButton) {
      const card = event.target.closest(".info-block");
      const block = findBlock(card.dataset.id);
      block.plane = planeButton.dataset.plane;
      renderBlocks();
      save();
      return;
    }
    const action = event.target.dataset.action;
    const card = event.target.closest(".info-block");
    if (!action || !card) return;
    const block = findBlock(card.dataset.id);
    if (action === "join") {
      if (!block.participants.includes(state.profile.name)) block.participants.push(state.profile.name);
      showBubble(`${block.title}에 참여했어요.`);
    }
    if (action === "comment") {
      showBubble("댓글은 블럭 안 텍스트 영역에 바로 적어볼 수 있어요.");
    }
    if (action === "delete") {
      if (block.owner !== state.profile.name) return;
      currentWorld().blocks = currentWorld().blocks.filter((item) => item.id !== block.id);
      selectedBlockId = null;
    }
    renderBlocks();
    save();
  });

  board.addEventListener("input", (event) => {
    const card = event.target.closest(".info-block");
    const sizeField = event.target.dataset.sizeField;
    if (card && sizeField) {
      const block = findBlock(card.dataset.id);
      if (block.owner !== state.profile.name) return;
      if (sizeField === "opacity") {
        block.opacity = Number(event.target.value) / 100;
        card.style.opacity = block.opacity;
      } else {
        block[sizeField] = Number(event.target.value);
        if (sizeField === "width") card.style.width = `${block.width}px`;
        if (sizeField === "height") card.style.minHeight = `${block.height}px`;
      }
      save();
      return;
    }

    const field = event.target.dataset.field;
    if (!card || !field) return;
    const block = findBlock(card.dataset.id);
    if (block.owner !== state.profile.name || !block.textEditing) return;
    block[field] = event.target.textContent.trim() || block[field];
    save();
  });

  inkCanvas.addEventListener("pointerdown", (event) => {
    if (!["draw", "erase-pixel", "erase-stroke"].includes(state.tool)) return;
    const point = pointerPoint(event);
    if (!isInsideDrawableCanvas(point)) return;
    if (state.tool === "erase-stroke") {
      isDrawing = true;
      eraseStrokeAt(point);
      return;
    }
    isDrawing = true;
    activeStroke = {
      mode: state.tool,
      color: state.avatar.color,
      size: Number(document.querySelector("#brushSize").value),
      points: [point]
    };
    inkContext.beginPath();
    inkContext.globalCompositeOperation = state.tool === "erase-pixel" ? "destination-out" : "source-over";
    inkContext.strokeStyle = state.avatar.color;
    inkContext.lineWidth = activeStroke.size;
    inkContext.moveTo(point.x, point.y);
  });

  inkCanvas.addEventListener("pointermove", (event) => {
    if (state.tool === "erase-stroke") {
      if (!isDrawing) return;
      const point = pointerPoint(event);
      if (isInsideDrawableCanvas(point)) eraseStrokeAt(point);
      return;
    }
    if (!isDrawing || !activeStroke) return;
    const point = pointerPoint(event);
    if (!isInsideDrawableCanvas(point)) {
      isDrawing = false;
      currentWorld().strokes.push(activeStroke);
      activeStroke = null;
      inkContext.globalCompositeOperation = "source-over";
      save();
      return;
    }
    activeStroke.points.push(point);
    inkContext.lineTo(point.x, point.y);
    inkContext.stroke();
  });

  window.addEventListener("pointerup", () => {
    if (activeStroke) {
      currentWorld().strokes.push(activeStroke);
      activeStroke = null;
      inkContext.globalCompositeOperation = "source-over";
      save();
    }
    isDrawing = false;
  });

  document.addEventListener("keydown", (event) => {
    const activeTag = document.activeElement.tagName.toLowerCase();
    if (["input", "textarea", "select"].includes(activeTag)) return;
    if (event.key === "Shift") pressedKeys.add("Shift");
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      pressedKeys.add(event.key);
    }
  });

  document.addEventListener("keyup", (event) => {
    pressedKeys.delete(event.key);
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Shift"].some((key) => pressedKeys.has(key))) save();
  });

  document.querySelector("#sendChat").addEventListener("click", sendChat);
  document.querySelector("#chatInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") sendChat();
  });

  canvasFrame.addEventListener("dragover", (event) => {
    event.preventDefault();
    canvasFrame.classList.add("drag-over");
  });

  canvasFrame.addEventListener("dragleave", () => canvasFrame.classList.remove("drag-over"));

  canvasFrame.addEventListener("drop", (event) => {
    event.preventDefault();
    canvasFrame.classList.remove("drag-over");
    const file = event.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const block = {
        id: `block-${Date.now()}`,
        type: "image",
        title: file.name,
        label: "이미지",
        owner: state.profile.name,
        participants: [],
        hue: 188,
        x: pointerPoint(event).x,
        y: pointerPoint(event).y,
        width: 320,
        height: 260,
        opacity: 1,
        textEditing: false,
        showEditor: false,
        fontSize: 16,
        src: reader.result,
        plane: "free"
      };
      currentWorld().blocks.push(block);
      selectedBlockId = block.id;
      renderBlocks();
      save();
    };
    reader.readAsDataURL(file);
  });

  window.addEventListener("resize", resizeInkCanvas);
}

function sendChat() {
  const input = document.querySelector("#chatInput");
  const message = input.value.trim();
  if (!message) return;
  showBubble(message);
  input.value = "";
  window.setTimeout(() => showEdgeBubble("민지: 좋아요, 링크도 공유해줘!", "right"), 900);
}

function seedBlocks() {
  if (currentWorld().blocks.length) return;
  addBlock("activity");
  addBlock("study");
  currentWorld().blocks[0].x = 120;
  currentWorld().blocks[0].y = 110;
  currentWorld().blocks[1].x = 480;
  currentWorld().blocks[1].y = 160;
}

load();
renderBlockOptions();
setupEvents();
render();
seedBlocks();
render();
requestAnimationFrame(animateMovement);
