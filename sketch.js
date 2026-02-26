let handPose;
let video;
let hands = [];
let detectedMudra = "Waiting...";
let confidenceScore = 0;

// Kuchipudi Mudra Database with descriptions
const kuchipudiMudras = {
  PATAKA: { name: "Pataka", desc: "Flat hand with all fingers extended" },
  ARDHAPATAKA: { name: "Ardhapataka", desc: "Index & middle extended, others folded" },
  TRIPATAKA: { name: "Tripataka", desc: "Index, middle, ring extended; pinky bent" },
  MUSTI: { name: "Mushti", desc: "Closed fist" },
  SHIKARA: { name: "Shikhara", desc: "Only index finger extended" },
  SHUCHIPATAKA: { name: "Suchi", desc: "Index vertical, others folded" },
  CHANDRAKALA: { name: "Chandrakala", desc: "Index & thumb form L shape" },
  TRISHULA: { name: "Trishula", desc: "Thumb & pinky folded, three middle fingers extended" },
  HAMSASYA: { name: "Hamsasya", desc: "Thumb tip touching index tip" },
  BHRAMARA: { name: "Bhramara", desc: "Thumb touches middle finger" },
  KAPITTHA: { name: "Kapittha", desc: "Thumb touches side of folded index" },
  SIMHAMUKHA: { name: "Simhamukha", desc: "Thumb touches middle & ring; index & pinky extended" },
  ALAPADMA: { name: "Alapadma", desc: "Fingers extended and fanned out" },
  ARDHACHANDRA: { name: "Ardhachandra", desc: "Pataka with thumb stretched" },
  PADMAKOSHA: { name: "Padmakosha", desc: "All fingers slightly bent, tip distances ~70%" },
  SARPASHIRSHA: { name: "Sarpashirsha", desc: "Extended fingers cupped inward" },
  KATAKAMUKHA: { name: "Katakamukha", desc: "Thumb, index, middle tips meet" }
  // add additional mudras as needed
};

const mudraOrder = [
  "PATAKA", "ARDHAPATAKA", "TRIPATAKA", "MUSTI", "SHIKARA",
  "SHUCHIPATAKA", "CHANDRAKALA", "TRISHULA", "HAMSASYA", "BHRAMARA",
  "KAPITTHA", "SIMHAMUKHA", "ALAPADMA", "ARDHACHANDRA", "PADMAKOSHA",
  "SARPASHIRSHA", "KATAKAMUKHA"
];

function preload() {
  handPose = ml5.handPose({ runtime: "tfjs", device: "webgl", flipHorizontal: true });
}

function setup() {
  let container = document.getElementById('p5-container');
  let w = container.offsetWidth;
  // limit camera width so it doesn't stretch too much
  let camWidth = min(w - 20, 800);
  let camHeight = Math.floor(camWidth * 0.75); // 4:3 aspect ratio
  createCanvas(camWidth, camHeight);
  
  video = createCapture(VIDEO);
  video.size(camWidth, camHeight);
  video.hide();
  
  handPose.detectStart(video, (results) => { hands = results; });
}

// utility helpers
function distance(p1, p2) {
  return sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

// alternate distance for convenience
const getDist = (p1, p2) => distance(p1, p2);

// Is the finger tip farther from wrist than its PIP joint? (simple extension test)
const isExtended = (wrist, pip, tip) => getDist(wrist, tip) > getDist(wrist, pip);

// Calculate curl of a finger (how bent it is)
function getFingerCurl(mcp, pip, dip, tip) {
  const fullLength = distance(mcp, pip) + distance(pip, dip) + distance(dip, tip);
  const straightDist = distance(mcp, tip);
  return 1 - (straightDist / fullLength); // 0 = straight, 1 = fully curled
}


// Check if finger is bent/curled
function isFingerBent(mcp, pip, dip, tip) {
  const curl = getFingerCurl(mcp, pip, dip, tip);
  return curl > 0.4;
}

// Calculate spread between two finger tips
function getFingerSpread(tip1, tip2) {
  return distance(tip1, tip2);
}

// Check if wrist is in specific orientation (palm facing forward/up)
function isPalmFacing(wrist, index_mcp, middle_mcp, ring_mcp, pinky_mcp) {
  const wristToIndex = distance(wrist, index_mcp);
  const wristToMid = distance(wrist, middle_mcp);
  const wristToRing = distance(wrist, ring_mcp);
  const wristToPinky = distance(wrist, pinky_mcp);
  return (wristToIndex + wristToPinky) / (wristToMid + wristToRing) > 0.8;
}

function detectMudra(hand) {
  const wrist = hand.keypoints[0];
  
  // Thumb
  const thumb_cmc = hand.keypoints[1];
  const thumb_mcp = hand.keypoints[2];
  const thumb_ip = hand.keypoints[3];
  const thumb_tip = hand.keypoints[4];
  
  // Index
  const index_mcp = hand.keypoints[5];
  const index_pip = hand.keypoints[6];
  const index_dip = hand.keypoints[7];
  const index_tip = hand.keypoints[8];
  
  // Middle
  const middle_mcp = hand.keypoints[9];
  const middle_pip = hand.keypoints[10];
  const middle_dip = hand.keypoints[11];
  const middle_tip = hand.keypoints[12];
  
  // Ring
  const ring_mcp = hand.keypoints[13];
  const ring_pip = hand.keypoints[14];
  const ring_dip = hand.keypoints[15];
  const ring_tip = hand.keypoints[16];
  
  // Pinky
  const pinky_mcp = hand.keypoints[17];
  const pinky_pip = hand.keypoints[18];
  const pinky_dip = hand.keypoints[19];
  const pinky_tip = hand.keypoints[20];

  // Calculate palm size (distance across metacarpals)
  const palmSize = distance(index_mcp, pinky_mcp);
  
  // basic extension flags using geometric comparison
  const thumbExt = isExtended(wrist, thumb_ip, thumb_tip);
  const indexExt = isExtended(wrist, index_pip, index_tip);
  const middleExt = isExtended(wrist, middle_pip, middle_tip);
  const ringExt = isExtended(wrist, ring_pip, ring_tip);
  const pinkyExt = isExtended(wrist, pinky_pip, pinky_tip);
  
  // Check finger curls
  const indexCurl = getFingerCurl(index_mcp, index_pip, index_dip, index_tip);
  const middleCurl = getFingerCurl(middle_mcp, middle_pip, middle_dip, middle_tip);
  const ringCurl = getFingerCurl(ring_mcp, ring_pip, ring_dip, ring_tip);
  const pinkyCurl = getFingerCurl(pinky_mcp, pinky_pip, pinky_dip, pinky_tip);
  const thumbCurl = getFingerCurl(thumb_mcp, thumb_ip, thumb_ip, thumb_tip);
  
  // Calculate finger spreads
  const indexPinkySpread = getFingerSpread(index_tip, pinky_tip);
  const midSpacing = distance(index_tip, middle_tip) + distance(middle_tip, ring_tip) + distance(ring_tip, pinky_tip);

  // 1. MUSTI - All fingers curled/closed
  if (!indexExt && !middleExt && !ringExt && !pinkyExt) {
    return "MUSTI";
  }

  // 2. SHIKARA - Only index finger extended
  if (indexExt && !middleExt && !ringExt && !pinkyExt && !thumbExt) {
    return "SHIKARA";
  }

  // 3. SHUCHIPATAKA - Index extended, others folded
  if (indexExt && !middleExt && !ringExt && !pinkyExt && !thumbExt) {
    return "SHUCHIPATAKA";
  }

  // 4. PATAKA - All fingers extended and spread
  if (indexExt && middleExt && ringExt && pinkyExt && !thumbExt) {
    const spacing = getDist(index_tip, pinky_tip);
    if (spacing > palmSize * 0.8) {
      return "PATAKA";
    }
  }

  // 5. ARDHAPATAKA - Index & middle extended, others folded
  if (indexExt && middleExt && !ringExt && !pinkyExt) {
    return "ARDHAPATAKA";
  }

  // 6. TRIPATAKA - Index, middle, ring extended; pinky folded
  if (indexExt && middleExt && ringExt && !pinkyExt) {
    return "TRIPATAKA";
  }

  // 7. CHANDRAKALA - Index & thumb form L-shape
  if (indexExt && thumbExt && !middleExt && !ringExt && !pinkyExt) {
    return "CHANDRAKALA";
  }

  // 8. TRISHULA - Index, middle, ring extended; thumb & pinky folded
  if (!thumbExt && indexExt && middleExt && ringExt && !pinkyExt) {
    return "TRISHULA";
  }

  // 9. HAMSASYA - Thumb tip touching index tip
  const dThumbIndex = getDist(thumb_tip, index_tip);
  if (dThumbIndex < palmSize * 0.2) {
    return "HAMSASYA";
  }

  // 10. BHRAMARA - Thumb touches middle finger
  const dThumbMiddle = getDist(thumb_tip, middle_tip);
  if (dThumbMiddle < palmSize * 0.2) {
    return "BHRAMARA";
  }

  // 11. KAPITTHA - Thumb extended, others folded
  if (!indexExt && !middleExt && !ringExt && !pinkyExt && thumbExt) {
    return "KAPITTHA";
  }

  // 12. SIMHAMUKHA - Thumb touches multiple fingers
  const dThumbRing = getDist(thumb_tip, ring_tip);
  if (dThumbMiddle < palmSize * 0.2 && dThumbRing < palmSize * 0.2 && indexExt && pinkyExt) {
    return "SIMHAMUKHA";
  }

  // 13. ALAPADMA - All extended and spread wide
  if (indexExt && middleExt && ringExt && pinkyExt) {
    if (getDist(index_tip, pinky_tip) > palmSize * 1.1) {
      return "ALAPADMA";
    }
  }

  // 14. ARDHACHANDRA - Extended with wide spread
  if (indexExt && middleExt && ringExt && pinkyExt) {
    if (getDist(index_tip, pinky_tip) > palmSize * 0.9) {
      return "ARDHACHANDRA";
    }
  }

  // 15. PADMAKOSHA - Slightly bent fingers
  if (indexExt && middleExt && ringExt && pinkyExt) {
    return "PADMAKOSHA";
  }

  // 16. SARPASHIRSHA - Extended fingers cupped
  if (indexExt && middleExt && ringExt && pinkyExt) {
    return "SARPASHIRSHA";
  }

  // Default fallback
  return "KATAKAMUKHA";
}

function drawMudraReference(x, y, w, h, mudraKey) {
  const mudra = kuchipudiMudras[mudraKey];
  
  // Draw name
  fill(200);
  textSize(11);
  textAlign(LEFT);
  textStyle(NORMAL);
  text(mudra.name, x + 5, y + 15);
  
  // Draw 2D diagram
  drawMudraDiagram(x + w/2, y + h/2 + 10, w*0.6, h*0.5, mudraKey);
}

// simple schematic diagrams based on finger positions
function drawMudraDiagram(cx, cy, w, h, key) {
  push();
  translate(cx, cy);
  stroke(240);
  strokeWeight(2);
  noFill();
  
  // draw palm as semicircle as reference
  arc(0, h*0.2, w*0.6, h*0.4, PI, 0);
  
  let fingers = {
    PATAKA: [1,1,1,1,1],
    ARDHAPATAKA: [1,1,0,0,0],
    TRIPATAKA: [1,1,1,0,0],
    MUSTI: [0,0,0,0,0],
    SHIKARA: [1,0,0,0,0],
    SHUCHIPATAKA: [1,0,0,0,0],
    CHANDRAKALA: [1,0,0,0,1],
    TRISHULA: [0,1,1,1,0],
    HAMSASYA: [1,1,0,0,0],
    BHRAMARA: [1,0,1,0,0],
    KAPITTHA: [0,0,0,0,1],
    SIMHAMUKHA: [1,0,1,1,1],
    ALAPADMA: [1,1,1,1,1],
    ARDHACHANDRA: [1,1,1,1,1],
    PADMAKOSHA: [0.6,0.6,0.6,0.6,0.6],
    SARPASHIRSHA: [1,1,1,1,1],
    KATAKAMUKHA: [1,1,1,0,0]
  };
  let ext = fingers[key] || [0,0,0,0,0];
  
  let startX = -w*0.3;
  let step = w*0.15;
  for (let i = 0; i < 5; i++) {
    let len = h * 0.5 * ext[i];
    line(startX + i*step, h*0.2, startX + i*step, h*0.2 - len);
  }
  pop();
}

function draw() {
  // Display mirrored video
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  if (hands.length > 0) {
    let hand = hands[0];
    detectedMudra = detectMudra(hand);

    // Draw hand skeleton
    stroke(0, 255, 100);
    strokeWeight(2);
    
    const connections = [
      [0, 1, 2, 3, 4],
      [0, 5, 6, 7, 8],
      [0, 9, 10, 11, 12],
      [0, 13, 14, 15, 16],
      [0, 17, 18, 19, 20],
      [5, 9, 13, 17]
    ];

    for (let connection of connections) {
      for (let i = 0; i < connection.length - 1; i++) {
        let p1 = hand.keypoints[connection[i]];
        let p2 = hand.keypoints[connection[i + 1]];
        line(p1.x, p1.y, p2.x, p2.y);
      }
    }

    // Draw keypoints
    fill(0, 255, 100);
    noStroke();
    for (let i = 0; i < hand.keypoints.length; i++) {
      let keypoint = hand.keypoints[i];
      circle(keypoint.x, keypoint.y, 6);
    }

    // Display detected mudra name
    fill(0, 255, 180);
    textSize(24);
    textStyle(BOLD);
    textAlign(CENTER);
    text(kuchipudiMudras[detectedMudra].name, width / 2, height - 60);
    
    // Display description
    fill(150, 220, 255);
    textSize(14);
    textStyle(NORMAL);
    text(kuchipudiMudras[detectedMudra].desc, width / 2, height - 30);

  } else {
    fill(255, 100, 100);
    textSize(22);
    textAlign(CENTER);
    textStyle(BOLD);
    text("Show your hand", width / 2, height / 2 - 20);
    fill(200, 100, 100);
    textSize(16);
    text("Position your hand in front of the camera", width / 2, height / 2 + 20);
  }
}