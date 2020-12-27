/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
const SocketIOClient = require("socket.io-client");
const io = new SocketIOClient("http://localhost:3000");
const socket = io.connect();

const handpose = require("@tensorflow-models/handpose");
const dat = require("dat.gui");
const Stats = require("stats.js");
const tf = require("@tensorflow/tfjs-core");

const videoWidth = 800;
const videoHeight = 600;
const stats = new Stats();

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isiOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
  return isAndroid() || isiOS();
}

function sendOSC(predictions) {
  socket.emit("dispatch", { "predictions": predictions, "oscFormatting": guiState.oscFormatting });
}

//------------------------------------

function drawPath(ctx, points, closePath) {
  const region = new Path2D();
  region.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    region.lineTo(point[0], point[1]);
  }

  if (closePath) {
    region.closePath();
  }
  ctx.stroke(region);
}

/**
 * Loads a the camera to be used in the demo
 *
 */
async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
      "Browser API navigator.mediaDevices.getUserMedia not available");
  }

  const video = document.getElementById("video");
  video.width = videoWidth;
  video.height = videoHeight;

  const mobile = isMobile();
  const stream = await navigator.mediaDevices.getUserMedia({
    "audio": false,
    "video": {
      facingMode: "user",
      width: mobile ? undefined : videoWidth,
      height: mobile ? undefined : videoHeight
    }
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function changeVideoSource(newDevice) {
  const video = document.getElementById("video");
  video.srcObject = null;
  const mobile = isMobile();
  const stream = await navigator.mediaDevices.getUserMedia({
    "audio": false,
    "video": {
      facingMode: "user",
      width: mobile ? undefined : videoWidth,
      height: mobile ? undefined : videoHeight,
      deviceId: newDevice
    }
  });
  video.srcObject = stream;
}

async function loadVideo() {
  const video = await setupCamera();
  video.play();

  return video;
}

async function listVideoDevices() {
  const allDevices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = allDevices.filter(device => device.kind === "videoinput").map(device => device.label);
  return videoDevices;
}

const guiState =
{
  devices: {
    videoDevices: []
  },
  renderLandMarks: false,
  sendOsc: true,
  oscPort: 8008,
  host: '127.0.0.1',
  output: {
    showVideo: false,
  },
  oscFormatting: {
    handInViewConfidence: false,
    boundingBox: false,
    landmarks: true,
    annotations: false
  },
  net: null
};

/**
 * Sets up dat.gui controller on the top-right of the window
 */
async function setupGui(cameras, net) {
  guiState.net = net;
  /*
  if (cameras.length > 0) {
    guiState.camera = cameras[0].deviceId;
  }

  const gui = new dat.GUI({ width: 300 });

  let devices = gui.addFolder("Devices");
  const videoDevices = await listVideoDevices();
  const videoDeviceController = devices.add(guiState.devices, "videoDevices", videoDevices);

  videoDeviceController.onChange(async function (selectedDevice) {
    const allDevices = await navigator.mediaDevices.enumerateDevices();
    const matchedDeviceId = allDevices.filter(device => device.label === selectedDevice).map(device => device.deviceId);
    changeVideoSource(matchedDeviceId);
  });

  gui.add(guiState, 'renderLandMarks');
  gui.add(guiState, "sendOsc");
  oscPortController = gui.add(guiState, "oscPort").onChange(function (value) {
    socket.emit("oscPortSet", value);
  });

  let lastValidHost = '127.0.0.1';
  hostController = gui.add(guiState, "host").onFinishChange(function (value) {
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(value)) {
      socket.emit("hostSet", value);
      lastValidHost = value;
    } else {
      guiState.host = lastValidHost
      alert(value + ' is not a valid IP.')
    }
  }).listen();

  let output = gui.addFolder("Output");
  output.add(guiState.output, "showVideo");
  output.open();

  let oscFormatting = gui.addFolder("OSC output formatting");
  oscFormatting.add(guiState.oscFormatting, "handInViewConfidence");
  oscFormatting.add(guiState.oscFormatting, "boundingBox");
  oscFormatting.add(guiState.oscFormatting, "landmarks");
  oscFormatting.add(guiState.oscFormatting, "annotations");
  oscFormatting.open();

  gui.close()
  */
}

/**
 * Sets up a frames per second panel on the top-left of the window
 */
function setupFPS() {
  stats.showPanel(0);  // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(stats.dom);
}

let fingerLookupIndices =
{
  thumb: [0, 1, 2, 3, 4],
  indexFinger: [0, 5, 6, 7, 8],
  middleFinger: [0, 9, 10, 11, 12],
  ringFinger: [0, 13, 14, 15, 16],
  pinky: [0, 17, 18, 19, 20]
}; // for rendering each finger as a polyline

function drawPoint(ctx, y, x, r, idx) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.save()
  ctx.translate(x, y);
  ctx.scale(-1, 1);
  ctx.fillText(idx, 5, -5);
  ctx.restore()
  //ctx.fillStyle = _color;
  ctx.fill();
}

function drawKeypoints(ctx, keypoints) {
  const keypointsArray = keypoints;

  for (let i = 0; i < keypointsArray.length; i++) {
    const y = keypointsArray[i][0];
    const x = keypointsArray[i][1];
    drawPoint(ctx, x - 2, y - 2, 3, i);
  }
  const fingers = Object.keys(fingerLookupIndices);
  for (let i = 0; i < fingers.length; i++) {
    const finger = fingers[i];
    const points = fingerLookupIndices[finger].map(idx => keypoints[idx]);
    drawPath(ctx, points, false);
  }
}


function detectHands(video, net) {
  video.addEventListener('loadeddata', function () {
    // Video is loaded and can be played
    const canvas = document.getElementById("output");
    const ctx = canvas.getContext("2d");

    canvas.width = videoWidth;
    canvas.height = videoHeight;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.fillStyle = '#32EEDB';
    ctx.strokeStyle = '#32EEDB';
    ctx.lineWidth = 0.5;

    async function renderPrediction() {
      // Begin monitoring code for frames per second
      stats.begin();

      ctx.clearRect(0, 0, videoWidth, videoHeight);

      if (guiState.output.showVideo) {
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      }

      const predictions = await guiState.net.estimateHands(video);

      if (predictions.length > 0) {
        if (guiState.renderLandMarks) {
          const result = predictions[0].landmarks;
          drawKeypoints(ctx, result)
        }
        sendOSC(predictions[0]);
      }

      stats.end();

      requestAnimationFrame(renderPrediction);
    }

    renderPrediction();
  }, false);
}

async function bindPage() {
  const net = await handpose.load({ flipHorizontal: true });

  let video;

  try {
    video = await loadVideo();
  } catch (e) {
    alert("No webcam device found. Connect webcam and restart.");
    throw e;
  }

  setupGui([], net);
  //setupFPS();
  detectHands(video, net);

  document.getElementById("loading").style.display = "none";
  //document.getElementById("main").style.display = "block";
}

navigator.getUserMedia = navigator.getUserMedia ||
  navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
bindPage();
