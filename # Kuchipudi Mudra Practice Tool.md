# Kuchipudi Mudra Practice Tool

This is an interactive web application designed to help users practice **Kuchipudi Mudras** (classical Indian dance hand gestures) using real-time computer vision.

The application uses your webcam to track your hand movements and validates whether you are performing the selected mudra correctly. It also provides a realistic 3D visualization of the target mudra for reference.

## Features

- **Real-time Hand Tracking**: Uses `ml5.js` and `handPose` to detect hand keypoints via webcam.
- **Mudra Detection**: Algorithms to classify various single and double hand gestures based on finger extension, curling, and spacing.
- **Interactive Feedback**:
  - **Green Skeleton**: Correct mudra detected.
  - **Red Skeleton**: Incorrect mudra.
- **3D Visualization**: A p5.js WEBGL render of the target mudra, complete with skin tone, jewelry (bangle), and Alta (red dye) markings, which rotates for better viewing.
- **UI Controls**: A dropdown menu to select specific mudras to practice.

## Supported Mudras

The application currently supports a variety of Asamyuta (single) and Samyuta (double) Hastas, including:

- **Single Hand**: Pataka, Ardhapataka, Tripataka, Mushti, Shikhara, Kapittha, Katakamukha, Alapadma, Mayura, and more.
- **Double Hand**: Anjali, Matsya, Shivalinga.

## Technologies Used

- **p5.js**: For canvas rendering, drawing the skeleton, and 3D graphics.
- **ml5.js**: For machine learning models (HandPose) running in the browser.
- **HTML/CSS**: For the user interface overlay.

## How to Run

1.  Ensure you have the necessary libraries linked in your `index.html` (p5.js and ml5.js).
2.  Serve the project directory using a local web server.
    - If you have Python installed: `python -m http.server`
    - If you use VS Code: Use the "Live Server" extension.
3.  Open the browser and allow webcam access when prompted.
4.  Select a mudra from the dropdown menu and mimic the 3D hand shown on the right.

## Project Structure

- `sketch.js`: Main logic for video capture, hand detection, classification, and rendering.
- `index.html`: Entry point (assumed).