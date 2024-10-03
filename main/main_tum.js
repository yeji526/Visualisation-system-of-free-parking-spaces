import * as THREE from 'three'
import * as math from 'mathjs'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js'
import { FileLoader } from 'three/src/loaders/FileLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


//SCENE
const scene = new THREE.Scene()
const scene1 = new THREE.Scene()
//CAMERA 690850.534588, 5336083.112424,
const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 500 )
camera.lookAt(690850.534588, 5336063.112424, 0)
scene.add(camera)

//RENDERER
const renderer = new THREE.WebGLRenderer()
renderer.setSize( window.innerWidth, window.innerHeight )
renderer.setClearColor(new THREE.Color(0xccddee));
document.body.appendChild( renderer.domElement )

let totalParkingLength = 0;
let totalEmptySpotLength = 0;
let occupancyRateElement = document.getElementById('occupancyRate');
let toggleTrackingButton = document.getElementById('toggleTracking');
let vehicleButtonsContainer = document.getElementById('vehicleButtons');
let trackingMode = 'global'; // 'global' or 'vehicle'
let currentVehicleId = null;
let toggleLegendButton = document.getElementById('toggleLegend');
let legendContainer = document.getElementById('legend');
let toggleInfoButton = document.getElementById('toggleInfo');
let infoBox = document.getElementById('infoBox');

camera.position.set( 690900.534588, 5336163.112424, 350 )
const controls = new OrbitControls( camera, renderer.domElement );
controls.target.set(690850.534588, 5336083.112424, 0);
controls.update();

//LIGHT
const spotlight = new THREE.DirectionalLight(0xffffff, 1)
spotlight.position.set(690850.534588, 5336083.112424, 35 )
scene.add(spotlight)

//pkspace
const parkingnumber = 20;
const parkingAreas = [];
const parkinglots = [];

function loadCSV(filepath) {
    return new Promise((resolve, reject) => {
        const csvloader = new FileLoader();
        csvloader.load(filepath, function(data) {
            const lines = data.split('\n');
            const XArray = [];
            const YArray = [];
            for (var i = 0; i < lines.length; i++) {
                const rowData = lines[i].split(',');
                XArray.push(rowData[1]);
                YArray.push(rowData[0]);
            }

            const vertices = new Float32Array([
                XArray[0], YArray[0], -26.0,
                XArray[1], YArray[1], -26.0,
                XArray[2], YArray[2], -26.0,
                XArray[3], YArray[3], -26.0
            ]);
            const height = 2;
            const topVertices = new Float32Array([
                XArray[0], YArray[0], -26.0 + height,
                XArray[1], YArray[1], -26.0 + height,
                XArray[2], YArray[2], -26.0 + height,
                XArray[3], YArray[3], -26.0 + height
            ]);
            const allVertices = new Float32Array([...vertices, ...topVertices]);
            const indices = [
                // 底面
                0, 1, 2,
                2, 3, 0,

                // 顶面
                4, 5, 6,
                6, 7, 4,

                // 前面
                0, 3, 7,
                7, 4, 0,

                // 后面
                1, 2, 6,
                6, 5, 1,

                // 左面
                0, 1, 5,
                5, 4, 0,

                // 右面
                2, 3, 7,
                7, 6, 2,
            ];

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute(
                'position',
                new THREE.BufferAttribute(allVertices, 3)
            );
            geometry.setIndex(indices);
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
                opacity: 0.3,
                transparent: true,
            });
            const mesh = new THREE.Mesh(geometry, material);
            scene1.add(mesh);

            const area = {
                x1: parseFloat(XArray[0]), y1: parseFloat(YArray[0]),
                x2: parseFloat(XArray[1]), y2: parseFloat(YArray[1]),
                x3: parseFloat(XArray[2]), y3: parseFloat(YArray[2]),
                x4: parseFloat(XArray[3]), y4: parseFloat(YArray[3])
            };
            resolve({ area, mesh });
        }, undefined, function(error) {
            reject(error);
        });
    });
}
async function loadParkingAreas() {
    const promises = [];
    for (let j = 1; j <= parkingnumber; j++) {
        const index2 = String(j);
        const filepath2 = `./tumparking${index2}.csv`;
        promises.push(loadCSV(filepath2));
    }

    try {
        const results = await Promise.all(promises);
        results.forEach(result => {
            parkingAreas.push(result.area);
            parkinglots.push(result.mesh);
        });
    } catch (error) {
        console.error('Error loading parking areas:', error);
    }
}
loadParkingAreas();
// console.log('pa',parkingAreas);

//pcd
const num = 6000;
const loader = new PCDLoader();
const TM_base = new THREE.Matrix4();
TM_base.set(
    0.999546221400587, -0.0330742414374746, 0.00000000, 691041.248379479,
    0.0329858862269359, 0.998920300148719, 0.00000000, 5336089.81812224,
	0.00000000, 0.00000000, 1.00000000, 0.00000000,
	0.00000000, 0.00000000, 0.00000000, 1.00000000	
);
let pcdExist1 = null;
let pcdExist2 = null;
let pointCloud1Loaded = false;
let center1 = new THREE.Vector3(0, 0, 0);
let pointCloud2Loaded = false;
let center2 = new THREE.Vector3(0, 0, 0);
function pcdload1(filepath) {    
    loader.load(filepath, function (pcd) {
        if (pcdExist1) {
            scene1.remove(pcdExist1);
            pcdExist1 = null;
        }
        pcdExist1 = pcd;
        pcdExist1.applyMatrix4(TM_base);
        scene1.add(pcdExist1);

        // 计算点云中心点
        pcdExist1.geometry.computeBoundingBox();
        pcdExist1.geometry.boundingBox.getCenter(center1);
        center1.applyMatrix4(TM_base);
        center1.z = -25;
        pointCloud1Loaded = true;
    });
}
function pcdload2(filepath) {    
    loader.load(filepath, function (pcd) {
        if (pcdExist2) {
            scene1.remove(pcdExist2);
            pcdExist2 = null;
        }
        pcdExist2 = pcd;
        pcdExist2.applyMatrix4(TM_base);
        scene1.add(pcdExist2);

        // 计算点云中心点
        pcdExist2.geometry.computeBoundingBox();
        pcdExist2.geometry.boundingBox.getCenter(center2);
        center2.applyMatrix4(TM_base);
        center2.z = -25;
        pointCloud2Loaded = true;
    });
}

//json
const jsonscene = new THREE.Group();
const freescene = new THREE.Group();
scene.add(jsonscene);
scene.add(freescene);
const positionARR = [];
const scaleARR = [];
const carlength = 4;
const dataCache = new Map();
const filepathtum = './MLS2018_Arcisstr_instance_20cm_full.json';
async function loadJsonData(filePath1) {
    const response = await fetch(filePath1);
    const jsonData = await response.json();
    dataCache.set(jsonData);
    return jsonData;
}

function inside(point, area) {
    const x = point.x;
    const y = point.y;
    const vertices = [
        { x: area.x1, y: area.y1 },
        { x: area.x2, y: area.y2 },
        { x: area.x3, y: area.y3 },
        { x: area.x4, y: area.y4 }
    ];
    let intersections = 0;
    for (let i = 0; i < 4; i++) {
        const p1 = vertices[i];
        const p2 = vertices[(i + 1) % 4];
        if (y === p1.y && y === p2.y) {
            if (x >= Math.min(p1.x, p2.x) && x <= Math.max(p1.x, p2.x)) {
                return true;
            }
        } else if (y >= Math.min(p1.y, p2.y) && y <= Math.max(p1.y, p2.y)) {
            const xIntersection = ((y - p1.y) * (p2.x - p1.x)) / (p2.y - p1.y) + p1.x;
            if (xIntersection === x) {
                return true;
            }
            if (xIntersection > x) {
                intersections++;
            }
        }
    }
    return intersections % 2 === 1;
}

function clearGroup(group) {
    while (group.children.length > 0) {
        const object = group.children[0];
        group.remove(object);

        // 释放几何体和材质占用的内存
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            object.material.dispose();
        }
    }
}

function distance(point1, point2) {
    return Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2);
}

function isShortEdge(edgePoint1, edgePoint2, parkingVertices) {
	const edgeLength = distance(edgePoint1, edgePoint2);
	const edgeLengths = parkingVertices.map((v, i) => distance(v, parkingVertices[(i + 1) % parkingVertices.length]));
	edgeLengths.sort((a, b) => a - b);
	const shortestEdges = [edgeLengths[0], edgeLengths[1]];
	return edgeLength === shortestEdges[0] || edgeLength === shortestEdges[1];
  }

function ToendisPathClear(carpos, point, midPoint) {
	for (const car of carpos) {
	  if (distance(car, midPoint) < distance(midPoint, point)) {
		return false;
	  }
	}
	return true;
}
function renderEmptySpot(rotz, position, width, length, freescene) {
	const emptySpotGeometry = new THREE.PlaneGeometry(length, width);
	const emptySpotMaterial = new THREE.MeshBasicMaterial({
	  color: 0xaaff03,
	  side: THREE.DoubleSide,
	  opacity: 1,
	  transparent: false,
      visible: false
	});
	const emptySpotMesh = new THREE.Mesh(emptySpotGeometry, emptySpotMaterial);
	emptySpotMesh.position.set(position.x, position.y, -26);
	emptySpotMesh.rotation.z = rotz;
    const uid = generateUID(Math.round(position.x), Math.round(position.y));
    emptySpotMesh.userData.uid = uid;
	freescene.add(emptySpotMesh);
}

function generateUID(roundedX, roundedY) {
    return `Pos${roundedX}_${roundedY}`;
}



//simulated vehicles
let edgeCoordinates = {};
let vehicleRoutes = {};
const tumURL = 'tum.xml';
const osmURL = 'tum.osm.net.xml';   
vehicleRoutes = await fetchvehXMLFile(tumURL);
edgeCoordinates = await fetchrouXMLFile(osmURL);

async function fetchvehXMLFile(url) {
    const response = await fetch(url);
    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");
    xmlDoc.querySelectorAll('vehicle').forEach(vehicle => {
        const vehicleId = vehicle.getAttribute('id');
        const routeElement = vehicle.querySelector('route');
        if (routeElement) {
            const edges = routeElement.getAttribute('edges').split(' ');
            vehicleRoutes[vehicleId] = edges;
        }
    });

    return vehicleRoutes;
}

async function fetchrouXMLFile(url) {
    const response = await fetch(url);
    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");
    const TFM = [
        [0.667999359075572,  -0.0223622815591308, 690785.556708680],
        [0.0223622815591308, 0.665986014354800, 5335860.85849132],
        [0, 0, 1]
    ];
    xmlDoc.querySelectorAll('edge').forEach(edge => {
        const edgeId = edge.getAttribute('id');
        const shape = edge.querySelector('lane').getAttribute('shape');
        if (shape) {
            const coordinates = shape.split(' ').map(coord => {
                const [x, y] = coord.split(',').map(Number);
                return applyTransformation(TFM, [x, y]);
            });
            edgeCoordinates[edgeId] = coordinates;
        }
    });
    return edgeCoordinates;
}

let paths = {};
paths = renderRoutes(vehicleRoutes,edgeCoordinates);

function renderRoutes(vehicleRoutes, edgeCoordinates) {
    const paths = {};
    Object.entries(vehicleRoutes).forEach(([vehicleId, edges]) =>  {
        const geometry = new THREE.BufferGeometry();
        const points = [];
        edges.forEach(edgeId => {
            if (edgeCoordinates[edgeId]) {
                edgeCoordinates[edgeId].forEach(coord => {
                points.push(new THREE.Vector3(coord[0], coord[1], -24));
                });
            }
        });
        const path = new THREE.CatmullRomCurve3(points);
        paths[vehicleId] = path;
    });
    return paths;
}
// console.log('paths',paths);

function applyTransformation(matrix, point) {
    const [x, y] = point;
    const homogeneousPoint = [x, y, 1];

    const transformedX = matrix[0][0] * homogeneousPoint[0] + matrix[0][1] * homogeneousPoint[1] + matrix[0][2] * homogeneousPoint[2];
    const transformedY = matrix[1][0] * homogeneousPoint[0] + matrix[1][1] * homogeneousPoint[1] + matrix[1][2] * homogeneousPoint[2];

    return [transformedX, transformedY];
}

// VEHICLE renderer
let vehicle1, vehicle2, curve1, curve2 = 0;
const loader2 = new GLTFLoader();
loader2.load('model/toyota.glb',function(gltf){
    vehicle1 = gltf.scene;
    scene.add(vehicle1);
    scene1.add(vehicle1);
})
loader2.load('model/toyota.glb',function(gltf){
    vehicle2 = gltf.scene;
    scene.add(vehicle2);
    scene1.add(vehicle2);
})
curve1 = paths['veh3'];
curve2 = paths['veh0'];
// console.log(paths);
let progress1 = 0;
let progress2 = 0;


const revealedGroup = new THREE.Group();
scene1.add(revealedGroup);
const processedUIDs = new Set(); // 持久化的集合，用于跟踪已处理过的UID
const objectCooldowns = new Map(); // 用于跟踪对象上次被处理的时间
const removedUIDs = new Set(); // 用于跟踪已经移除的UID
function animate() {
    if (vehicle1 && curve1) {
        vehicle1.scale.set(1, 1, 1);
        vehicle1.position.copy(center1);
        const perc1 = getPercentageOnCurve(curve1, center1);
        const nextPoint = curve1.getPointAt((perc1 + 0.05) % 1);
        vehicle1.lookAt(nextPoint);
        const up = new THREE.Vector3(0, 0, 1);
        vehicle1.up.copy(up);
        vehicle1.rotateY(Math.PI);
        const frame = Math.round(2000 * progress1);
        let filePath1 = `./tum_dynamic/veh1/segmented_pointcloud_${frame}.pcd`;
        // pcdload1(filePath1);

        progress1 += 0.002;
        if (progress1 > 1) {
            progress1 = 0;
            // console.log('xxxxxxxxxxxxxxx1', position1);

            // const header = "x,y,z\n";
            // const data = position1.map(pos => `${pos.x},${pos.y},${pos.z}`).join("\n");
            // const csv = header + data;

            // // Create Blob object
            // const blob = new Blob([csv], { type: 'text/csv' });

            // // Use FileSaver.js to save the file
            // saveAs(blob, 'vehicle_positions1.csv');
            // position1 = [];
        }
        revealRectangles(vehicle1.position, nextPoint);
    }

    if (vehicle2 && curve2) {
        vehicle2.scale.set(1, 1, 1);
        // const point2 = curve2.getPointAt(progress2);

        // if (pointCloud2Loaded) {
            // 将车辆移动到点云中心点
            vehicle2.position.copy(center2);
        //     pointCloud2Loaded = false;  // 重置标志以等待下一个点云加载完成
        // }
        // vehicle2.position.copy(point2);
        const perc2 = getPercentageOnCurve(curve2, center2);
        // console.log('center2:',perc2);
        const nextPoint = curve2.getPointAt((perc2 + 0.01) % 1);
        vehicle2.lookAt(nextPoint);
        const up = new THREE.Vector3(0, 0, 1);
        vehicle2.up.copy(up);
        vehicle2.rotateY(Math.PI);
        const frame = Math.round(2000 * progress2);
        let filePath2 = `./tum_dynamic/veh0/segmented_pointcloud_${frame}.pcd`;
        // pcdload2(filePath2);
        progress2 += 0.001;
        if (progress2 > 1) {
            progress2 = 0;
            // // console.log('xxxxxxxxxxxxxxx2', position2);

            // // const header = "x,y,z\n";
            // // const data = position2.map(pos => `${pos.x},${pos.y},${pos.z}`).join("\n");
            // // const csv = header + data;

            // // Create Blob object
            // // const blob = new Blob([csv], { type: 'text/csv' });

            // // Use FileSaver.js to save the file
            // // saveAs(blob, 'vehicle_positions2.csv');
            // // position2 = [];
        }
        revealRectangles(vehicle2.position, nextPoint);
    }

    if (trackingMode === 'vehicle' && currentVehicleId) {
        let vehicle;
        
        // 根据 currentVehicleId 选择车辆
        if (currentVehicleId === 'veh3') {
            vehicle = vehicle1;
        } else if (currentVehicleId === 'veh0') {
            vehicle = vehicle2;
        }
    
        if (vehicle) {
            const targetPosition = vehicle.position.clone().add(new THREE.Vector3(-10, -30, 50));
            const targetLookAt = vehicle.position.clone();
            camera.position.lerp(targetPosition, 0.1); // 线性插值来平滑摄像机的移动
            camera.lookAt(targetLookAt); // 摄像机始终看向车辆
        }
    }

    const currentTime = performance.now();
    revealedGroup.children.forEach(object => {
        const elapsedTime = (currentTime - object.userData.revealTime) / 1000;
        const lerpFactor = Math.min(1, elapsedTime / 60);
        object.material.color.lerpColors(object.userData.originalColor, new THREE.Color(0x43faf1), lerpFactor);
    });
    controls.update();

    renderer.render(scene1, camera);
    requestAnimationFrame(animate);
}
const tumscene = new THREE.Group();
scene.add(tumscene);
const jsonDatatum = await loadJsonData(filepathtum);
    let tumcarposARR = Array.from({ length: parkingnumber }, () => []);
    let tumcarscaleARR = Array.from({ length: parkingnumber }, () => []);
    let tumcarrotARR = Array.from({ length: parkingnumber }, () => []);
    const filteredData = jsonDatatum.filter(data => data.obj_type !== "Pedestrian");

    filteredData.forEach(data => {
        const { position, scale, rotation } = data.psr;
        scaleARR.push(data.psr.scale);
        const { x, y, z } = data.psr.position;
        const vector = new THREE.Vector3(x, y, z);
        vector.applyMatrix4(TM_base); //位置坐标转换
        position.x = vector.x;
        position.y = vector.y;
        position.z = vector.z;
        positionARR.push(vector);
        const rotationQuaternion = new THREE.Quaternion(); //旋转转换
        const nullVector = new THREE.Vector3();
        TM_base.decompose(nullVector, rotationQuaternion, nullVector);
        const realrotation = new THREE.Euler().setFromQuaternion(rotationQuaternion, 'XYZ').z;
        data.psr.rotation = {
            x: 0,
            y: 0,
            z: realrotation
        };
        const point = { x: position.x, y: position.y };
        parkingAreas.forEach((area, index) => {
            if (inside(point, area)) {
                tumcarposARR[index].push(point);
                tumcarscaleARR[index].push(scale);
                tumcarrotARR[index].push(rotation.z - data.psr.rotation.z);
            }
        });
    });
    // console.log('carpos',tumcarposARR);
    clearGroup(tumscene);
    for ( let k = 0; k < parkingnumber; k++){
        for ( let l = 0; l < tumcarposARR[k].length; l++){
            const boxGeometry = new THREE.BoxGeometry(tumcarscaleARR[k][l].x, tumcarscaleARR[k][l].y, tumcarscaleARR[k][l].z);
            const boxMaterial = new THREE.MeshBasicMaterial({
                color: 0xbb33FA,
                wireframe: true,
                visible: false
            });
            const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
            boxMesh.position.set(tumcarposARR[k][l].x, tumcarposARR[k][l].y, -26);
            boxMesh.rotation.set(0, 0, tumcarrotARR[k][l]);
            tumscene.add(boxMesh);
        }
    }
    detecttum(parkingAreas, tumcarposARR, tumcarscaleARR, carlength, freescene);
    // scene1.add(freescene);
animate();

function detecttum(parkingAreas, kfframe, kfframescale, carlength, freescene) {
    totalParkingLength = 0;
    for (let j = 0; j < parkingnumber; j++){//车位
        const parkingVertices = [
            { x: parkingAreas[j].x1, y: parkingAreas[j].y1 },
            { x: parkingAreas[j].x2, y: parkingAreas[j].y2 },
            { x: parkingAreas[j].x3, y: parkingAreas[j].y3 },
            { x: parkingAreas[j].x4, y: parkingAreas[j].y4 }
        ];
        const shortedges = [];
        for (let a = 0; a < parkingVertices.length; a++) {
            const edgePoint1 = parkingVertices[a];
            const edgePoint2 = parkingVertices[(a + 1) % parkingVertices.length];
            if (isShortEdge(edgePoint1, edgePoint2, parkingVertices)) {
                const midpoint = {
                    x: (edgePoint1.x + edgePoint2.x) / 2,
                    y: (edgePoint1.y + edgePoint2.y) / 2
                };
                shortedges.push(midpoint);
            }
            if (shortedges.length === 2) break;
        }
        
        const vector = {
            x: shortedges[1].x - shortedges[0].x,
            y: shortedges[1].y - shortedges[0].y
        };
        let angle = Math.atan2(vector.y, vector.x);
        if (angle < 0){
            angle = 2 * Math.PI + angle;
        }
        const parkingLength = distance(shortedges[0], shortedges[1]);
        totalParkingLength += parkingLength;


        if ( kfframe[j].length === 0){
            const emptySpotPosition = {
                x: (shortedges[1].x + shortedges[0].x) / 2,
                y: (shortedges[1].y + shortedges[0].y) / 2
            }
            const emptySpotLength = distance(shortedges[0], shortedges[1]);
            const emptySpotWidth = 1.5;
            renderEmptySpot(angle, emptySpotPosition, emptySpotWidth, emptySpotLength, freescene);
        }
        else {
            for (let k = 0; k < kfframe[j].length; k++){//车位里的车
                if (k > 0 && ((distance(kfframe[j][k-1], kfframe[j][k]) - (kfframescale[j][k-1].x / 2 + kfframescale[j][k].x / 2)) > carlength) ) {
                    const emptySpotPosition = {
                        x: (kfframe[j][k-1].x + kfframe[j][k].x) / 2,
                        y: (kfframe[j][k-1].y + kfframe[j][k].y) / 2
                    };
                    const emptySpotWidth = kfframescale[j][k].y;
                    const emptySpotLength = (distance(kfframe[j][k-1], kfframe[j][k]) - (kfframescale[j][k-1].x / 2 + kfframescale[j][k].x / 2));
                    renderEmptySpot(angle, emptySpotPosition, emptySpotWidth, emptySpotLength, freescene);
                
                }
                else {
                    for (let p = 0; p < shortedges.length; p++) {
                        if (distance(kfframe[j][k], shortedges[p]) - (kfframescale[j][k].x / 2) > carlength  &&
                            ToendisPathClear(kfframe[j], kfframe[j][k], shortedges[p])) {
                                if (angle > 0 && angle <= Math.PI && kfframe[j][k].y < shortedges[p].y){
                                    const emptySpotPosition = {
                                    x: (kfframe[j][k].x + kfframescale[j][k].x * Math.cos(angle) + shortedges[p].x) / 2,
                                    y: (kfframe[j][k].y + kfframescale[j][k].x * Math.sin(angle) + shortedges[p].y) / 2
                                };
                                    const emptySpotWidth = kfframescale[j][k].y;
                                    const emptySpotLength = (distance(kfframe[j][k], shortedges[p]) - (kfframescale[j][k].x / 2));
                                    renderEmptySpot(angle, emptySpotPosition, emptySpotWidth, emptySpotLength, freescene);
                                }
                                else if (angle > 0 && angle <= Math.PI && kfframe[j][k].y > shortedges[p].y){
                                    const emptySpotPosition = {
                                    x: (kfframe[j][k].x - kfframescale[j][k].x * Math.cos(angle) + shortedges[p].x) / 2,
                                    y: (kfframe[j][k].y - kfframescale[j][k].x * Math.sin(angle) + shortedges[p].y) / 2
                                };
                                    const emptySpotWidth = kfframescale[j][k].y;
                                    const emptySpotLength = (distance(kfframe[j][k], shortedges[p]) - (kfframescale[j][k].x / 2));
                                    renderEmptySpot(angle, emptySpotPosition, emptySpotWidth, emptySpotLength, freescene);
                                }
                                else if (angle <= 2 * Math.PI && angle > Math.PI && kfframe[j][k].y > shortedges[p].y){
                                    const emptySpotPosition = {
                                    x: (kfframe[j][k].x + kfframescale[j][k].x * Math.cos(angle) + shortedges[p].x) / 2,
                                    y: (kfframe[j][k].y + kfframescale[j][k].x * Math.sin(angle) + shortedges[p].y) / 2
                                };
                                    const emptySpotWidth = kfframescale[j][k].y;
                                    const emptySpotLength = (distance(kfframe[j][k], shortedges[p]) - (kfframescale[j][k].x / 2));
                                    renderEmptySpot(angle, emptySpotPosition, emptySpotWidth, emptySpotLength, freescene);
                                }
                                else if (angle <= 2 * Math.PI && angle > Math.PI && kfframe[j][k].y < shortedges[p].y){
                                    const emptySpotPosition = {
                                    x: (kfframe[j][k].x - kfframescale[j][k].x * Math.cos(angle) + shortedges[p].x) / 2,
                                    y: (kfframe[j][k].y - kfframescale[j][k].x * Math.sin(angle) + shortedges[p].y) / 2
                                };
                                    const emptySpotWidth = kfframescale[j][k].y;
                                    const emptySpotLength = (distance(kfframe[j][k], shortedges[p]) - (kfframescale[j][k].x / 2));
                                    renderEmptySpot(angle, emptySpotPosition, emptySpotWidth, emptySpotLength, freescene);
                                }
                        }
                    
                }
            }
        }
    }
}
}


function updateOccupancyRate() {
    const occupancyRate = totalEmptySpotLength;
    occupancyRateElement.textContent = `Free lot number: ${(occupancyRate).toFixed(0)}`;
}


function revealRectangles(carPosition, nextCarPosition) {
    const revealRadius = 20;
    let emptySpotRemoved = false;
    let emptySpotAdded = false;
    const lotUIDs = new Set(); // 用来跟踪已经处理过的uid
    
freescene.children.forEach(mesh => {
    if (mesh.userData.uid) {
        lotUIDs.add(mesh.userData.uid);
    }
})
for (let i = revealedGroup.children.length - 1; i >= 0; i--) {
    const object = revealedGroup.children[i];
    const uid = object.userData.uid;

    if (distance(nextCarPosition, object.position) < revealRadius) {
        revealedGroup.remove(object);
        if (object.geometry.type === 'PlaneGeometry' && !removedUIDs.has(uid)) {
            emptySpotRemoved = true;
            const lotnumber = object.geometry.parameters.width / 4;
            totalEmptySpotLength -= lotnumber; // 假设宽度表示长度
            removedUIDs.add(uid); // 标记为已移除
        }
    }
}
    const currentTime = performance.now();
    // 添加车后方20米范围内的对象
    scene.traverse(function (object) {
        if (object.isMesh && (object.geometry.type === 'BoxGeometry' || object.geometry.type === 'PlaneGeometry')) {
            const rectPosition = object.position;
            if (distance(carPosition, rectPosition) < revealRadius && distance(nextCarPosition, rectPosition) >= 20) {
                if (!object.material.visible) {
                    object.material.visible = true;
                    const clonedGeometry = object.geometry.clone();
                    const clonedMaterial = object.material.clone();
                    const clonedMesh = new THREE.Mesh(clonedGeometry, clonedMaterial);
                    clonedMesh.position.copy(object.position);
                    clonedMesh.rotation.copy(object.rotation);
                    clonedMesh.scale.copy(object.scale);
                    clonedMesh.userData.revealTime = performance.now(); // 记录揭露时间
                    clonedMesh.userData.originalColor = new THREE.Color(object.material.color.getHex()); 
                    revealedGroup.add(clonedMesh);
                    object.material.visible = false;
                    if (object.geometry.type === 'PlaneGeometry' && !processedUIDs.has(object.userData.uid) && lotUIDs.has(object.userData.uid)) {
                        // console.log(object.geometry.parameters.width);
                        emptySpotAdded = true;
                        const lotnumber = object.geometry.parameters.width / 4;
                        totalEmptySpotLength += lotnumber;
                        processedUIDs.add(object.userData.uid); // 添加到已处理集合中
                        objectCooldowns.set(object.userData.uid, currentTime); // 记录处理时间
                    }
                }
            }
        }
    });
    if (emptySpotRemoved || emptySpotAdded) {
        
    // console.log('total',totalParkingLength);
    // console.log('emp',totalEmptySpotLength);
        updateOccupancyRate();
    }
}
function getPercentageOnCurve(curve, targetPoint) {
    const divisions = 1000;  // 分割数，越高精度越高，但计算量也越大
    let closestPoint;
    let minDistance = Infinity;
    let closestPercentage = 0;

    for (let i = 0; i <= divisions; i++) {
        const t = i / divisions;
        const point = curve.getPointAt(t);
        const distance = point.distanceTo(targetPoint);

        if (distance < minDistance) {
            minDistance = distance;
            closestPoint = point;
            closestPercentage = t;
        }
    }

    return closestPercentage;
}


function toggleVehicleButtons(show) {
    vehicleButtonsContainer.style.display = show ? 'block' : 'none';
}
toggleTrackingButton.addEventListener('click', () => {
    trackingMode = trackingMode === 'global' ? 'vehicle' : 'global';
    toggleVehicleButtons(trackingMode === 'vehicle');
    if (trackingMode === 'vehicle') {
        detectCurrentVehicles();
    } else {
        currentVehicleId = null;
        controls.target.set(690850.534588, 5336083.112424, 0);
        camera.position.set(690900.534588, 5336163.112424, 350);
        controls.update();
    }
});
toggleLegendButton.addEventListener('click', () => {
    const isLegendVisible = legendContainer.style.display === 'block';
    legendContainer.style.display = isLegendVisible ? 'none' : 'block';
});
toggleInfoButton.addEventListener('click', () => {
    const isInfoBoxVisible = infoBox.style.display === 'block';
    infoBox.style.display = isInfoBoxVisible ? 'none' : 'block';
});

function detectCurrentVehicles() {
    // 清除现有的车辆按钮
    while (vehicleButtonsContainer.firstChild) {
        vehicleButtonsContainer.removeChild(vehicleButtonsContainer.firstChild);
    }

    // 只为场景中的两辆车创建按钮
    const vehicleIds = ['veh3', 'veh0']; 

    vehicleIds.forEach(vehicleId => {
        if (paths[vehicleId]) {
            const button = document.createElement('div');
            button.className = 'vehicleButton';
            button.textContent = `Vehicle ${vehicleId}`;
            button.addEventListener('click', () => {
                currentVehicleId = vehicleId;
                trackingMode = 'vehicle';
                focusOnVehicle(vehicleId);
            });
            vehicleButtonsContainer.appendChild(button);
        }
    });
}
function renderLegendModel() {
    const legendCanvas = document.getElementById('vehicleModelCanvas');
    const legendRenderer = new THREE.WebGLRenderer({ canvas: legendCanvas, alpha: true });
    legendRenderer.setSize(50, 50);

    const legendScene = new THREE.Scene();
    const legendCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    legendCamera.position.set(0, 1, 3);

    loader2.load('model/toyota.glb', function(gltf) {
        const model = gltf.scene;
        model.scale.set(0.5, 0.5, 0.5);  // 缩放模型
        legendScene.add(model);

        function animateLegend() {
            requestAnimationFrame(animateLegend);
            model.rotation.y += 0.01;  // 使模型旋转
            legendRenderer.render(legendScene, legendCamera);
        }
        animateLegend();
}
)};

renderLegendModel();