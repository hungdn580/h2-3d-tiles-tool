var viewer = new Cesium.Viewer('cesiumContainer');

var tileset = viewer.scene.primitives.add(new Cesium.Cesium3DTileset({
    url : 'http://localhost:8003/output/Instanced/InstanceWithTransform/tileset.json'
}));

viewer.zoomTo(tileset, new Cesium.HeadingPitchRange(0, -0.5, 0));
