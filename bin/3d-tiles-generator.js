#!/usr/bin/env node
'use strict';
var Cesium = require('cesium');
var fsExtra = require('fs-extra');
var path = require('path');
var Promise = require('bluebird');
var createBatchTableHierarchy = require('../lib/createBatchTableHierarchy');
var createBuildingsTile = require('../lib/createBuildingsTile');
var createB3dm = require('../lib/createB3dm');
var createCmpt = require('../lib/createCmpt');
var createI3dm = require('../lib/createI3dm');
var createInstancesTile = require('../lib/createInstancesTile');
var createPointCloudTile = require('../lib/createPointCloudTile');
var createTilesetJsonSingle = require('../lib/createTilesetJsonSingle');
var getProperties = require('../lib/getProperties');
var modifyGltfPaths = require('../lib/modifyGltfPaths');
var saveTile = require('../lib/saveTile');
var saveTilesetJson = require('../lib/saveTilesetJson');
var util = require('../lib/utility');

var Cartesian3 = Cesium.Cartesian3;
var CesiumMath = Cesium.Math;
var clone = Cesium.clone;
var defaultValue = Cesium.defaultValue;
var defined  = Cesium.defined;
var Matrix4 = Cesium.Matrix4;
var Quaternion = Cesium.Quaternion;

var lowercase = util.lowercase;
var metersToLongitude = util.metersToLongitude;
var metersToLatitude = util.metersToLatitude;
var wgs84Transform = util.wgs84Transform;

var optimizeForCesium = true;
var relativeToCenter = true;
var prettyJson = true;
var gzip = false;

var outputDirectory = 'output';

var latitude = Math.PI * 21.017981 / 180;
var longitude = Math.PI * 105.780984 / 180;

var tileWidth = 100.0;

var longitudeExtent = metersToLongitude(tileWidth, latitude);
var latitudeExtent = metersToLatitude(tileWidth);

var west = longitude - longitudeExtent / 2.0;
var south = latitude - latitudeExtent / 2.0;
var east = longitude + longitudeExtent / 2.0;
var north = latitude + latitudeExtent / 2.0;

var buildingTemplate = {
    numberOfBuildings : 10,
    tileWidth : tileWidth,
    averageWidth : 8.0,
    averageHeight : 10.0,
    diffuseType : 'white',
    translucencyType : 'opaque',
    longitude : longitude,
    latitude : latitude
};

var buildingsTransform = wgs84Transform(longitude, latitude, -20); // height is 0.0 because the base of building models is at the origin
var buildingsCenter = [buildingsTransform[12], buildingsTransform[13], buildingsTransform[14]];

// Small buildings
var smallGeometricError = 70.0; // Estimated
var smallHeight = 20.0; // Estimated
var smallRegion = [west, south, east, north, 0.0, smallHeight];
var smallRadius = tileWidth * 0.707107;
var smallSphere = [buildingsCenter[0], buildingsCenter[1], buildingsCenter[2] + smallHeight / 2.0, smallRadius];
var smallSphereLocal = [0.0, 0.0, smallHeight / 2.0, smallRadius];
var smallBoxLocal = [
    0.0, 0.0, smallHeight / 2.0, // center
    tileWidth / 2.0, 0.0, 0.0,   // width
    0.0, tileWidth / 2.0, 0.0,   // depth
    0.0, 0.0, smallHeight / 2.0  // height
];

// Large buildings
var largeGeometricError = 240.0; // Estimated
var largeHeight = 88.0; // Estimated
var instancesGeometricError = 70.0; // Estimated

var instancesModelSize = 20.0;
var instancesHeight = instancesModelSize + 10.0; // Just a little extra padding at the top for aiding Cesium tests
var instancesTransform = wgs84Transform(longitude, latitude, instancesModelSize / 2.0);
var instancesRegion = [west, south, east, north, 0.0, instancesHeight];

// // Composite
// var compositeRegion = instancesRegion;
// var compositeGeometricError = instancesGeometricError;

var promises = [
    createTilesetWithTransforms()
];

Promise.all(promises)
    .then(function() {
        console.log('Done');
    });

function createTilesetWithTransforms() {

var lat = Math.PI * 21.017981 / 180;
var long = Math.PI * 105.780984 / 180;

console.log('lat', lat);
console.log('long', long);

var transform = Cesium.Transforms.headingPitchRollToFixedFrame(Cesium.Cartesian3.fromRadians(long, lat, 0), new Cesium.HeadingPitchRoll());
var array = Cesium.Matrix4.toArray(transform);
console.log(array);

    var tilesetName = 'TilesetWithTransforms';
    var tilesetDirectory = path.join(outputDirectory, 'Tilesets', tilesetName);
    var tilesetPath = path.join(tilesetDirectory, 'tileset.json');
    var buildingsTileName = 'buildings.b3dm';
    var buildingsTilePath = path.join(tilesetDirectory, buildingsTileName);
    var instancesTileName = 'instances.i3dm';
    var instancesTilePath = path.join(tilesetDirectory, instancesTileName);

    var rootTransform = Matrix4.pack(buildingsTransform, new Array(16));

    var rotation = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_FOUR);
    var translation = new Cartesian3(0, 0, 5.0);
    var scale = new Cartesian3(0.5, 0.5, 0.5);
    var childMatrix = Matrix4.fromTranslationQuaternionRotationScale(translation, rotation, scale);
    var childTransform = Matrix4.pack(childMatrix, new Array(16));

    var buildingsOptions = {
        buildingOptions : buildingTemplate,
        transform : Matrix4.IDENTITY,
        url : "instancesUrl",
        optimizeForCesium : optimizeForCesium,
        relativeToCenter : false
    };

    var tilesetJson = {
        asset : {
            version : '1.0'
        },
        properties : undefined,
        geometricError : smallGeometricError,
        root : {
            boundingVolume : {
                region : instancesRegion
            },
            transform : rootTransform,
            geometricError : instancesGeometricError,
            refine : 'REPLACE',
            content : {
                url : "ThreeBulding.b3dm"
            }
        }
    };

    return saveTilesetJson(tilesetPath, tilesetJson, prettyJson);
}
