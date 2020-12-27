# HandPose OSC
!! This is a simplified version of https://github.com/faaip/HandPose-OSC used for https://github.com/gonski/wekitunenator 

*Fork of [lysdexic audio's ](https://github.com/lysdexic-audio/)[n4m-handpose](https://github.com/lysdexic-audio/n4m-handpose), but runs stand-alone and outputs OSC instead of using Max*<br>

Wraps [MediaPipe Handpose](https://github.com/tensorflow/tfjs-models/tree/master/handpose) inside electron and serves the detected parts via OSC.

![demo](demo.gif)

## Running the program
If you're not interested in modifying the code, you can just download the latest [release](https://github.com/faaip/HandPose-OSC/releases).

# Steps
Make sure you have [node.js](https://nodejs.org/en/) installed. Additionally this has been developed using [yarn](https://yarnpkg.com/).

1. Install npm dependencies using `yarn install`. Since Electron's kind of big in size, this make take a while depending on your network environment.
2. Launch using `yarn start`
3. The node.script emits the detected results as a OSC. With each OSC address being a detected landmark.

## Building Electron App
First install all dependencies using `yarn install`.<br>
Then create the executable by running `yarn run dist`

## OSC output
By default the program outputs OSC to localhost, port 8008. This can be changed in the GUI. You can choose what to send over OSC from the GUI. By default the program sends:
* Confidence:
    * **Hand in view confidence** /handInViewConfidence [0..1]
* Bounding box
    * **top left:** /topLeft [x, y, z]
    * **bottom right:** /bottomRight [x, y, z]
* Landmarks:
    * **landmarks** /landmarks (21 * [x, y, z])
* Annotations:
    * **thumb** /annotations/thumb (4 * [x, y, z])
    * **index finger** /annotations/indexFinger (4 * [x, y, z])
    * **middle finger** /annotations/middleFinger (4 * [x, y, z])
    * **ring finger** /annotations/ringFinger (4 * [x, y, z])
    * **pinky** /annotations/pinky (4 * [x, y, z])
    * **palm base** /annotations/palmBase [x, y, z]
