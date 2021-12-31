#!/bin/bash

mkdir -p public/models
curl -L https://github.com/pixiv/three-vrm/raw/dev/packages/three-vrm/examples/models/three-vrm-girl.vrm -o public/models/three-vrm-girl.vrm
