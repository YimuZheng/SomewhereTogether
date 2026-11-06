let myVideo = null;
let otherVideo = null;
let p5l = null;
let peerConnected = false;
let ambientOn = false;
let currentScene = "beach";

const roomInput = document.getElementById("roomName");
const connectButton = document.getElementById("connect");
const statusText = document.getElementById("statusText");
const ambientButton = document.getElementById("ambientToggle");
const ambientAudio = document.getElementById("ambientAudio");
const sceneButtons = document.querySelectorAll(".scene-button");

const scenes = {
  beach: "assets/beach.wav",
  park: "assets/park.wav",
  mountain: "assets/mountain.wav"
};

const constraints = { audio: true, video: true };

connectButton.addEventListener("click", function () {
  const room = roomInput.value.trim();
  if (!room) {
    setStatus("Please enter a room name first.");
    roomInput.classList.add("is-invalid");
    roomInput.focus();
    return;
  }
  connectionStuff(room);
});

roomInput.addEventListener("input", function () {
  roomInput.classList.remove("is-invalid");
});

roomInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && !connectButton.disabled) {
    connectButton.click();
  }
});

ambientButton.addEventListener("click", function () {
  ambientOn = !ambientOn;
  if (ambientOn) {
    playAmbience();
  } else {
    ambientAudio.pause();
  }
  updateAmbientButton();
});

sceneButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const scene = button.dataset.scene;
    applyScene(scene);

    if (p5l && peerConnected) {
      try {
        p5l.send(JSON.stringify({ type: "scene", scene: scene }));
      } catch (error) {
        console.warn("Scene message not sent:", error);
      }
    }
  });
});

function setup() {
  const canvas = createCanvas(960, 270);
  canvas.parent("videoStuff");
  resizeVideoCanvas();
}

function windowResized() {
  resizeVideoCanvas();
}

function resizeVideoCanvas() {
  const container = document.getElementById("videoStuff");
  const w = container.clientWidth || 960;
  resizeCanvas(w, Math.round(w * 9 / 32));
}

function connectionStuff(roomName) {
  connectButton.disabled = true;
  roomInput.disabled = true;
  connectButton.textContent = "Joining…";
  setStatus("Asking for camera and microphone access…");

  myVideo = createCapture(constraints, function (stream) {

    p5l = new p5LiveMedia(this, "CAPTURE", stream, roomName);
    p5l.on("stream", gotStream);
    p5l.on("data", gotData);
    p5l.on("disconnect", gotDisconnect);

    connectButton.textContent = "Joined";
    setStatus("Room joined. Waiting for another person…");
  });

  myVideo.elt.muted = true;
  myVideo.elt.playsInline = true;
  myVideo.hide();
}

function gotStream(stream, id) {
  otherVideo = stream;
  peerConnected = true;
  otherVideo.elt.autoplay = true;
  otherVideo.elt.playsInline = true;
  otherVideo.elt.muted = false;
  otherVideo.hide();
  otherVideo.elt.play().catch(function (error) {
    console.warn("Remote audio playback blocked:", error);
  });
  setStatus("Connected! You're somewhere together.");
}

function gotData(data, id) {
  let message;
  try {
    message = JSON.parse(data);
  } catch (error) {
    return;
  }
  if (message && message.type === "scene" && scenes[message.scene]) {
    applyScene(message.scene);
  }
}

function gotDisconnect(id) {
  peerConnected = false;
  otherVideo = null;
  setStatus("Your guest has left. Waiting for someone to join…");
}

function draw() {
  background(24, 29, 35);
  const half = width / 2;

  if (myVideo && myVideo.elt.readyState >= 2) {
    push();
    translate(half, 0);
    scale(-1, 1);
    drawVideoCover(myVideo, 0, half);
    pop();
  }

  if (otherVideo && otherVideo.elt.readyState >= 2) {
    drawVideoCover(otherVideo, half, half);
  }
}

function drawVideoCover(video, x, panelWidth) {
  const videoWidth = video.elt.videoWidth;
  const videoHeight = video.elt.videoHeight;
  if (!videoWidth || !videoHeight) return;

  const panelRatio = panelWidth / height;
  let sx = 0, sy = 0, sw = videoWidth, sh = videoHeight;

  if (videoWidth / videoHeight > panelRatio) {
    sw = videoHeight * panelRatio;
    sx = (videoWidth - sw) / 2;
  } else {
    sh = videoWidth / panelRatio;
  }

  image(video, x, 0, panelWidth, height, sx, sy, sw, sh);
}

function applyScene(scene) {
  if (!Object.prototype.hasOwnProperty.call(scenes, scene)) return;
  currentScene = scene;
  document.body.dataset.scene = scene;

  sceneButtons.forEach(function (button) {
    const selected = button.dataset.scene === scene;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  ambientAudio.pause();
  ambientAudio.src = scenes[scene];
  ambientAudio.load();
  if (ambientOn) playAmbience();
}

function playAmbience() {
  if (!ambientAudio.src) ambientAudio.src = scenes[currentScene];
  ambientAudio.volume = 0.24;
  ambientAudio.play().catch(function () {
    ambientOn = false;
    updateAmbientButton();
    console.warn("Audio playback blocked; click Play sound to try again.");
  });
}

function updateAmbientButton() {
  ambientButton.textContent = ambientOn ? "Pause sound" : "Play sound";
  ambientButton.classList.toggle("is-off", !ambientOn);
}

function setStatus(message) {
  statusText.textContent = message;
}

applyScene("beach");
updateAmbientButton();
