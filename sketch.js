let handPose;
let video;
let hands = [];
let detectedMudra = "Waiting...";
let confidenceScore = 0;
let mudra3DViewer; // To hold the 3D graphics
let mudraSelector;
let targetMudra = "PATAKA"; // Default target

// Kuchipudi Mudra Database with descriptions
const kuchipudiMudras = {
  PATAKA: { name: "Pataka", desc: "Flat hand with all fingers extended" },
  ARDHAPATAKA: { name: "Ardhapataka", desc: "Pataka with ring and pinky fingers bent" },
  TRIPATAKA: { name: "Tripataka", desc: "Pataka with the ring finger bent" },
  MUSTI: { name: "Mushti", desc: "Closed fist" },
  SHIKARA: { name: "Shikhara", desc: "Fist with thumb extended up (thumbs-up)" },
  SHUCHIPATAKA: { name: "Suchi", desc: "Index vertical, others folded" },
  CHANDRAKALA: { name: "Chandrakala", desc: "Index & thumb form L shape" },
  TRISHULA: { name: "Trishula", desc: "Thumb & pinky folded, three middle fingers extended" },
  HAMSASYA: { name: "Hamsasya", desc: "Thumb tip touching index tip" },
  BHRAMARA: { name: "Bhramara", desc: "Thumb touches middle finger" },
  KAPITTHA: { name: "Kapittha", desc: "Fist with thumb over folded index finger" },
  SIMHAMUKHA: { name: "Simhamukha", desc: "Thumb touches middle & ring; index & pinky extended" },
  ALAPADMA: { name: "Alapadma", desc: "Fingers extended and fanned out" },
  ARDHACHANDRA: { name: "Ardhachandra", desc: "Pataka with thumb stretched" },
  PADMAKOSHA: { name: "Padmakosha", desc: "All fingers slightly bent, like a lotus bud" },
  SARPASHIRSHA: { name: "Sarpashirsha", desc: "Extended fingers cupped inward, like a snake hood" },
  KATAKAMUKHA: { name: "Katakamukha", desc: "Thumb, index, middle tips meet" },
  MAYURA: { name: "Mayura", desc: "Ring finger tip touches thumb tip, others extended" },
  MUKULA: { name: "Mukula", desc: "All five finger tips touching together" },
  KARTARIMUKHA: { name: "Kartarimukha", desc: "Index & Middle spread (scissors), others folded" },
  ANJALI: { name: "Anjali", desc: "Both palms joined together (Prayer)", type: "double" },
  MATSYA: { name: "Matsya", desc: "Hands stacked like a fish (Pataka on Pataka)", type: "double" },
  SHIVALINGA: { name: "Shivalinga", desc: "Left palm up (Ardhachandra), Right fist thumb up (Shikhara)", type: "double" }
  // add additional mudras as needed
};

// Schematic for 3D model. [Index, Middle, Ring, Pinky, Thumb]
// 1 = extended, 0 = folded, 0.5 = partially bent
const mudraSchematics = {
    PATAKA: [1,1,1,1,1],
    ARDHAPATAKA: [1,1,0,0,1],
    TRIPATAKA: [1,1,0,1,1],
    MUSTI: [0,0,0,0,0],
    SHIKARA: [0,0,0,0,1],
    SHUCHIPATAKA: [1,0,0,0,0],
    CHANDRAKALA: [1,0,0,0,1],
    TRISHULA: [1,1,1,0,0],
    HAMSASYA: [0.5,1,1,1,0.5],
    BHRAMARA: [0.5,0.5,1,1,0.5],
    KAPITTHA: [0,0,0,0,0.2],
    SIMHAMUKHA: [1,0.5,0.5,1,0.5],
    ALAPADMA: [1,1,1,1,1],
    ARDHACHANDRA: [1,1,1,1,1],
    PADMAKOSHA: [0.6,0.6,0.6,0.6,0.6],
    SARPASHIRSHA: [0.8,0.8,0.8,0.8,0.8],
    KATAKAMUKHA: [0.5,0.5,0.5,1,0.5],
    MAYURA: [1,1,0.5,1,0.5],
    MUKULA: [0.3,0.3,0.3,0.3,0.3],
    KARTARIMUKHA: [1,1,0,0,0],
    ANJALI: [1,1,1,1,1], // Schematic for one hand
    MATSYA: [1,1,1,1,1],
    SHIVALINGA: [0,0,0,0,1] // Schematic for the Shikhara hand
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
  
  // Create a 3D graphics buffer for the animation
  mudra3DViewer = createGraphics(200, 180, WEBGL);

  video = createCapture(VIDEO);
  video.size(camWidth, camHeight);
  video.hide();
  
  // Create UI for Mudra Selection
  let uiDiv = createDiv('');
  uiDiv.position(20, 20);
  uiDiv.style('z-index', '9999');
  
  let label = createSpan('Select Mudra: ');
  label.parent(uiDiv);
  label.style('color', '#ffffff');
  label.style('font-family', 'Segoe UI, sans-serif');
  label.style('font-size', '18px');
  label.style('text-shadow', '1px 1px 2px black');
  label.style('margin-right', '10px');
  
  mudraSelector = createSelect();
  mudraSelector.parent(uiDiv);
  mudraSelector.style('font-size', '16px');
  mudraSelector.style('padding', '8px 12px');
  mudraSelector.style('border-radius', '5px');
  mudraSelector.style('cursor', 'pointer');
  for (let key in kuchipudiMudras) {
    mudraSelector.option(kuchipudiMudras[key].name, key);
  }
  mudraSelector.selected("PATAKA");
  mudraSelector.changed(() => {
    targetMudra = mudraSelector.value();
  });

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

function classifySingleHand(hand) {
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

  // 17. MAYURA - Ring touches thumb, others extended
  if (dThumbRing < palmSize * 0.2 && indexExt && middleExt && pinkyExt) {
    return "MAYURA";
  }

  // 18. MUKULA - All tips together
  if (getDist(index_tip, thumb_tip) < palmSize * 0.2 && 
      getDist(middle_tip, thumb_tip) < palmSize * 0.2 &&
      getDist(ring_tip, thumb_tip) < palmSize * 0.2 &&
      getDist(pinky_tip, thumb_tip) < palmSize * 0.2) {
    return "MUKULA";
  }

  // 19. KARTARIMUKHA - Scissors
  if (indexExt && middleExt && !ringExt && !pinkyExt && getFingerSpread(index_tip, middle_tip) > palmSize * 0.3) {
    return "KARTARIMUKHA";
  }

  // Default fallback
  return "UNKNOWN";
}

function draw() {
  // Display mirrored video
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  let isCorrect = false;
  let feedbackMsg = "Incorrect";
  let detectedName = "";

  // Logic to validate against targetMudra
  if (hands.length > 0) {
    const targetInfo = kuchipudiMudras[targetMudra];
    const isDouble = targetInfo.type === "double";

    if (isDouble) {
      if (hands.length === 2) {
        // Double hand logic
        let h1 = classifySingleHand(hands[0]);
        let h2 = classifySingleHand(hands[1]);
        
        if (targetMudra === "ANJALI") {
          // Both Pataka, close together
          if ((h1 === "PATAKA" || h1 === "ARDHACHANDRA") && (h2 === "PATAKA" || h2 === "ARDHACHANDRA")) {
             if (distance(hands[0].keypoints[0], hands[1].keypoints[0]) < 150) isCorrect = true;
          }
        } else if (targetMudra === "MATSYA") {
          // Both Pataka, stacked
          if ((h1 === "PATAKA" || h1 === "ARDHACHANDRA") && (h2 === "PATAKA" || h2 === "ARDHACHANDRA")) {
             // Check vertical stacking roughly
             if (distance(hands[0].keypoints[0], hands[1].keypoints[0]) < 150) isCorrect = true;
          }
        } else if (targetMudra === "SHIVALINGA") {
          // One Shikhara, One Ardhachandra/Pataka
          const hasShikhara = (h1 === "SHIKARA" || h2 === "SHIKARA");
          const hasBase = (h1 === "ARDHACHANDRA" || h1 === "PATAKA" || h2 === "ARDHACHANDRA" || h2 === "PATAKA");
          if (hasShikhara && hasBase) isCorrect = true;
        }
        detectedName = h1 + " + " + h2;
      } else {
        detectedName = "Need 2 Hands";
      }
    } else {
      // Single hand logic
      for(let hand of hands) {
        let d = classifySingleHand(hand);
        if (d === targetMudra) {
          isCorrect = true;
          detectedName = d;
          break;
        }
        detectedName = d; // Show last detected
      }
    }

    // Draw hand skeleton
    stroke(isCorrect ? color(0, 255, 0) : color(255, 0, 0));
    strokeWeight(2);
    
    const connections = [
      [0, 1, 2, 3, 4],
      [0, 5, 6, 7, 8],
      [0, 9, 10, 11, 12],
      [0, 13, 14, 15, 16],
      [0, 17, 18, 19, 20],
      [5, 9, 13, 17]
    ];

    for(let hand of hands) {
    for (let connection of connections) {
      for (let i = 0; i < connection.length - 1; i++) {
        let p1 = hand.keypoints[connection[i]];
        let p2 = hand.keypoints[connection[i + 1]];
        line(p1.x, p1.y, p2.x, p2.y);
      }
    }

    // Draw keypoints
    fill(isCorrect ? color(0, 255, 0) : color(255, 0, 0));
    noStroke();
    for (let i = 0; i < hand.keypoints.length; i++) {
      let keypoint = hand.keypoints[i];
      circle(keypoint.x, keypoint.y, 6);
    }
    }

    // Display Status
    fill(isCorrect ? color(100, 255, 100) : color(255, 100, 100));
    textSize(24);
    textStyle(BOLD);
    textAlign(CENTER);
    
    let statusText = isCorrect ? "CORRECT!" : "INCORRECT";
    text(statusText, width / 2, height - 80);

    // Display Target vs Detected
    fill(255);
    textSize(18);
    text("Target: " + kuchipudiMudras[targetMudra].name, width / 2, height - 55);
    text("Detected: " + detectedName, width / 2, height - 30);
    
    // Display description
    fill(150, 220, 255);
    textSize(14);
    textStyle(NORMAL);
    text(kuchipudiMudras[targetMudra].desc, width / 2, height - 10);

    // Update and draw the 3D mudra animation
    update3DMudra(targetMudra);
    image(mudra3DViewer, width - mudra3DViewer.width - 10, 10);
    
    // Add a border and title for the 3D viewer
    noFill();
    stroke(150, 220, 255);
    strokeWeight(1);
    rect(width - mudra3DViewer.width - 10, 10, mudra3DViewer.width, mudra3DViewer.height);
    fill(150, 220, 255);
    noStroke();
    textAlign(CENTER);
    text("3D Reference", width - (mudra3DViewer.width/2) - 10, 25);
  } else {
    fill(255, 100, 100);
    textSize(22);
    textAlign(CENTER);
    textStyle(BOLD);
    text("Show your hand", width / 2, height / 2 - 20);
    fill(200, 100, 100);
    textSize(16);
    text("Select " + kuchipudiMudras[targetMudra].name + " and perform it", width / 2, height / 2 + 20);
  }
}

function update3DMudra(key) {
  const g = mudra3DViewer; // shorthand
  const fingerData = mudraSchematics[key] || [0,0,0,0,0];

  g.reset();
  g.background(40, 40, 50, 200); // Semi-transparent dark background
  
  // Enhanced Lighting for realism
  g.lights();
  g.ambientLight(120);
  g.pointLight(255, 240, 230, 0, -200, 300); // Warm key light
  g.directionalLight(200, 200, 200, 0, 0, -1); // Cool fill light

  g.push();

  // Set camera and rotation for animation
  g.translate(0, 40, 0); // Center in view
  g.rotateY(frameCount * 0.01); // Slow rotation
  g.rotateX(0.1); // Slight tilt
  g.scale(0.85);

  // Materials
  const skinColor = g.color(225, 175, 145);
  const altaColor = g.color(200, 20, 40); // Deep red for Alta
  const goldColor = g.color(255, 215, 0);

  // --- WRIST & BANGLE ---
  g.push();
  g.translate(0, 70, 0);
  g.noStroke();
  g.fill(skinColor);
  g.cylinder(22, 50); // Wrist
  
  // Gold Bangle
  g.translate(0, -15, 0);
  g.fill(goldColor);
  g.specularMaterial(255);
  g.shininess(100);
  g.torus(24, 4);
  g.pop();

  // --- PALM ---
  g.push();
  g.translate(0, 20, 0);
  g.noStroke();
  g.fill(skinColor);
  g.ellipsoid(35, 40, 15); // Better palm shape
  
  // Alta (Red Circle) on Palm Center
  g.translate(0, 0, 14);
  g.fill(altaColor);
  g.circle(0, 0, 18);
  g.pop();

  // --- FINGERS ---
  // Configuration for fingers relative to palm center
  // x offset, y offset, length, width, z-rotation (splay)
  const fingers = [
    { x: -28, y: -15, len: 60, w: 12, rotZ: -0.1 }, // Index
    { x: -10, y: -22, len: 70, w: 13, rotZ: -0.03 }, // Middle
    { x: 10, y: -22, len: 65, w: 12, rotZ: 0.03 },   // Ring
    { x: 28, y: -15, len: 50, w: 11, rotZ: 0.1 }     // Pinky
  ];

  for (let i = 0; i < 4; i++) {
    let ext = fingerData[i];
    let curl = (1 - ext) * 2.5; 
    drawRealisticFinger(g, fingers[i].x, fingers[i].y, fingers[i].len, fingers[i].w, curl, skinColor, altaColor, fingers[i].rotZ);
  }

  // --- THUMB ---
  // Thumb behaves differently, rotates from side
  let tExt = fingerData[4];
  let tCurl = (1 - tExt) * 1.5;
  
  g.push();
  g.translate(-35, 30, 10); // Thumb base position
  g.rotateZ(0.8); // Angle away from palm
  g.rotateY(-0.5); // Angle forward
  
  // Draw thumb using same helper but treated as straight-ish base
  drawRealisticFinger(g, 0, 0, 55, 14, tCurl, skinColor, altaColor, 0);
  g.pop();

  g.pop();
}

// Helper to draw segmented finger with Alta
function drawRealisticFinger(g, x, y, len, w, totalCurl, skin, alta, rotZ) {
  g.push();
  g.translate(x, y, 0);
  if (rotZ) g.rotateZ(rotZ);
  
  // Distribute curl across 3 joints
  let angle1 = totalCurl * 0.45;
  let angle2 = totalCurl * 0.35;
  let angle3 = totalCurl * 0.20;

  // Segment lengths
  let s1 = len * 0.45;
  let s2 = len * 0.35;
  let s3 = len * 0.20;

  g.fill(skin);
  g.noStroke();

  // Base Joint
  g.sphere(w * 0.6);

  // 1. Proximal Phalanx (tapered)
  g.rotateX(-angle1); // Bend inward
  g.push();
  g.translate(0, -s1/2, 0);
  g.cylinder(w * 0.5, s1);
  g.pop();
  g.translate(0, -s1, 0);

  // 2. Intermediate Phalanx
  g.rotateX(-angle2);
  g.sphere(w * 0.5); // Joint
  g.push();
  g.translate(0, -s2/2, 0);
  g.cylinder(w * 0.45, s2);
  g.pop();
  g.translate(0, -s2, 0);

  // 3. Distal Phalanx
  g.rotateX(-angle3);
  g.sphere(w * 0.45); // Joint
  g.push();
  g.translate(0, -s3/2, 0);
  g.cylinder(w * 0.4, s3);
  g.pop();
  g.translate(0, -s3, 0);

  // 4. Fingertip (Alta)
  g.fill(alta);
  g.translate(0, -2, 0);
  g.sphere(w * 0.42);

  g.pop();
}