import * as THREE from 'three'
import * as math from 'mathjs'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js'
import { FileLoader } from 'three/src/loaders/FileLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


//SCENE
const scene = new THREE.Scene()
const scene1 = new THREE.Scene()
//CAMERA 690930.133929186, 5335930.24525181,
const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 500 )
camera.position.set( 690930.133929186, 5335930.24525181, 150 )
camera.lookAt(690930.133929186, 5335930.24525181, 0)
scene.add(camera)

//RENDERER
const renderer = new THREE.WebGLRenderer()
renderer.setSize( window.innerWidth, window.innerHeight )
renderer.setClearColor(new THREE.Color(0xccddee));
document.body.appendChild( renderer.domElement )

camera.position.set( 690930.133929186, 5335930.24525181, 95 );
const controls = new OrbitControls( camera, renderer.domElement );
controls.target.set(690930.133929186, 5335930.24525181, 0);
controls.update();

//LIGHT
const spotlight = new THREE.DirectionalLight(0xffffff, 1)
spotlight.position.set(690930.133929186, 5335930.24525181, 35 )
scene.add(spotlight)

let totalEmptySpotLength = 0;
let occupancyRateElement = document.getElementById('occupancyRate');
let toggleTrackingButton = document.getElementById('toggleTracking');
let vehicleButtonsContainer = document.getElementById('vehicleButtons');
let trackingMode = 'global'; // 'global' or 'vehicle'
let currentVehicleId = null;

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
                x1: parseFloat(XArray[0].trim()), y1: parseFloat(YArray[0].trim()),
                x2: parseFloat(XArray[1].trim()), y2: parseFloat(YArray[1].trim()),
                x3: parseFloat(XArray[2].trim()), y3: parseFloat(YArray[2].trim()),
                x4: parseFloat(XArray[3].trim()), y4: parseFloat(YArray[3].trim())
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
        const filepath2 = `./parkingspaces/tumparking${index2}.csv`;
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
async function initializepark() {
    await loadParkingAreas();
    // console.log(parkingAreas);
    parkangle(parkingAreas);
}
initializepark();
let angles = [];
function parkangle(parkingAreas){
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
        angles.push(angle)
    }
}

//pcd
const loader = new PCDLoader();
const configpath = `./Config.txt`;
const TM = new THREE.Matrix4();
let pointCloudPaths = [];
let boundingBoxPaths = [];
let boundingBoxType = '';
let simulateTraffic = false;
await loadConfig();
async function loadConfig() {
    const response = await fetch(configpath);
    const data = await response.text();
    parseConfigFile(data);
}

// 解析配置文件内容
function parseConfigFile(data) {
    const lines = data.split('\n');
    let section = '';  // 用于标记当前读取的部分
    let matrixArray = [];

    lines.forEach(line => {
        line = line.trim();

        if (line.startsWith('#') || line === '') {
            return;  // 忽略注释和空行
        }

        if (line.startsWith('matrix:')) {
            section = 'matrix';
            return;
        }

        if (line.startsWith('pointclouds:')) {
            section = 'pointclouds';
            return;
        }

        if (line.startsWith('boundingbox_type:')) {
            section = 'boundingbox_type';
            return;
        }

        if (line.startsWith('boundingboxes:')) {
            section = 'boundingboxes';
            return;
        }

        if (line.startsWith('simulate_traffic:')) {
            section = 'simulate_traffic';
            return;
        }

        if (section === 'matrix') {
            const values = line.split(',').map(Number);
            matrixArray = matrixArray.concat(values);  // 累积矩阵的16个元素
            if (matrixArray.length === 16) {
                TM.set(
                    matrixArray[0], matrixArray[1], matrixArray[2], matrixArray[3],
                    matrixArray[4], matrixArray[5], matrixArray[6], matrixArray[7],
                    matrixArray[8], matrixArray[9], matrixArray[10], matrixArray[11],
                    matrixArray[12], matrixArray[13], matrixArray[14], matrixArray[15]
                );
            }
        } else if (section === 'pointclouds') {
            const [path, count] = line.split(',').map(item => item.trim());
            pointCloudPaths.push({ path, count: parseInt(count) });
        } 
        else if (section === 'boundingbox_type') {
            boundingBoxType = line;  // 直接保存识别框文件类型
        } 
        else if (section === 'boundingboxes') {
            const [path, count] = line.split(',').map(item => item.trim());
            boundingBoxPaths.push({ path, count: parseInt(count) });
        } 
        else if (section === 'simulate_traffic') {
            simulateTraffic = (line.toLowerCase().trim() === 'yes');
        }
    });
}
// console.log('st0',simulateTraffic);
// console.log('pcs',pointCloudPaths);
// console.log('tm',TM);
// TM.set(
//     0.283479374, -0.987908584, 0.000000000, 690918.7402,
//     0.966472813, 0.273502325, 0.000000000, 5335921.244,
//     0.00000000, 0.00000000, 1.00000000, -26.000000,
// 	0.00000000, 0.00000000, 0.00000000, 1.00000000
// );
// TM.set(
//     0.999546221400587, -0.0330742414374746, 0.00000000, 691041.248379479,
//     0.0329858862269359, 0.998920300148719, 0.00000000, 5336089.81812224,
// 	0.00000000, 0.00000000, 1.00000000, 0.00000000,
// 	0.00000000, 0.00000000, 0.00000000, 1.00000000	
// );
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);  // 白色环境光，强度为 0.5
scene1.add(ambientLight);
let lidars = [];  // 用来存储每组点云的雷达模型
const loaderGLTF = new GLTFLoader();
// if (simulateTraffic === false) {
//     pointCloudPaths.forEach((group, groupIndex) => {
//         // 使用 GLTFLoader 加载雷达模型
//         loaderGLTF.load('lidar.glb', function (gltf) {
//             const lidar = gltf.scene;  // 获取雷达模型
//             lidar.scale.set(0.1, 0.1, 0.1);  // 根据需要调整模型的缩放比例
//             lidar.rotation.x = 3 * Math.PI / 2;  // 沿 X 轴旋转 90 度
//             lidars.push(lidar);  // 将雷达模型存储到数组中
//             scene1.add(lidar);  // 将雷达模型添加到场景中
//         });
//     });
// }

let previousLidarPosition = new THREE.Vector3();  // 初始化上一个雷达位置为 (0, 0, 0)
let currentLidarPosition = new THREE.Vector3();
let pcdExistArray = [];
function pcdload(frame, path, groupIndex) {
    // let filePath = `${path}segmented_pointcloud_${frame}.pcd`;
    let index = String(frame).padStart(6, '0');
    let filePath = `${path}${index}.pcd`;
    // console.log('fp',filePath);
    loader.load(filePath, function (pcd) {
        const material = new THREE.PointsMaterial({
            size: 0.25,
            vertexColors: true
        });
        // 移除当前组的上一个点云
        if (pcdExistArray[groupIndex]) {
            scene1.remove(pcdExistArray[groupIndex]);
            pcdExistArray[groupIndex].geometry.dispose();
            pcdExistArray[groupIndex].material.dispose();
            pcdExistArray[groupIndex] = null;
        }
        pcd.material = material;
        // 设置新的点云
        pcd.applyMatrix4(TM);  // 应用转换矩阵
        scene1.add(pcd);

        // 将新点云存储到当前组的索引中
        pcdExistArray[groupIndex] = pcd;

        pcd.geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        pcd.geometry.boundingBox.getCenter(center);
        center.applyMatrix4(TM);  // 应用转换矩阵

        // 更新该组对应的雷达模型位置
        // if (simulateTraffic === false && lidars[groupIndex]) {
        //     lidars[groupIndex].position.copy(center);  // 将雷达模型放置在对应点云的中心点
        //     const lidarId = `lidar_${groupIndex}`;  // 为每个雷达分配一个唯一的 ID

        // vehicles[lidarId] = {
        //     model: lidars[groupIndex],  // 绑定雷达模型
        //     completed: false,  // 标记是否完成追踪
        //     addedToScene: true,  // 标记是否已经添加到场景中
        // };
        // }
        // if (simulateTraffic === false && lidars[groupIndex]) {
        //     // 将雷达模型放置在对应点云的中心点
        //     // lidars[groupIndex].position.copy(center);

        //     // 保存当前的雷达位置
        //     currentLidarPosition.copy(center);

        //     // 调用 revealRectangles 函数
        //     revealRectangles(previousLidarPosition, currentLidarPosition);

        //     // 将当前雷达位置更新为上一个位置，以便在下一帧中使用
        //     previousLidarPosition.copy(currentLidarPosition);
        // }
        if (simulateTraffic === false) {
            currentLidarPosition.copy(center);

    // 调用 revealRectangles 函数来处理追踪逻辑
    revealRectangles(previousLidarPosition, currentLidarPosition);
    previousLidarPosition.copy(currentLidarPosition);

    // 将点云的模型赋给 `vehicles` 中相应的车辆
    const vehicleId = `pcd_${groupIndex}`;  // 为每个点云生成一个唯一的车辆ID
    vehicles[vehicleId] = {
        model: pcd,  // 现在车辆的 model 是点云
        position: currentLidarPosition.clone(),
        completed: false,  // 标记为未完成追踪
        addedToScene: true,  // 标记为已经添加到场景中
        type: 'pointcloud'
    };
        }

    });
}

//json
const jsonscene = new THREE.Group();
const freescene = new THREE.Group();
const tumscene = new THREE.Group();
scene.add(tumscene);
scene.add(jsonscene);
scene.add(freescene);
let initialPositions = {};
const carlength = 3;
const covarianceThreshold = 0.1;
const covariancemaxThreshold = 0.9;
const dataCache = new Map();
async function loadCsvData(filePath) {
    const data = await d3.csv(filePath);
    dataCache.set(filePath, data);
    return data;
}
async function processCsvData(frame, path){
    const index1 = String(frame).padStart(6, '0');
    if (dataCache.has(index1)) {
        return dataCache.get(index1);
    }
    const filePath1 = `${path}${index1}.csv`;
    const csvData = await loadCsvData(filePath1);
    process(csvData);
}
async function process(csvData) {
    let carposARR = Array.from({ length: parkingnumber }, () => []);
    let carscaleARR = Array.from({ length: parkingnumber }, () => []);
    let carrotARR = Array.from({ length: parkingnumber }, () => []);
    const filteredData = csvData.filter(data => data.obj_mode !== "Pedestrian");

    filteredData.forEach(data => {
        const position = {
            x: parseFloat(data['position.x']),
            y: parseFloat(data['position.y']),
            z: parseFloat(data['position.z'])
        };
        const scale = {
            x: parseFloat(data['scale.x']),
            y: parseFloat(data['scale.y']),
            z: parseFloat(data['scale.z'])
        };
        const rotation = {
            x: parseFloat(data['rotation.x']),
            y: parseFloat(data['rotation.y']),
            z: parseFloat(data['rotation.z'])
        };
        const { x, y, z } = position;
        const vector = new THREE.Vector3(x, y, z);
        vector.applyMatrix4(TM); //位置坐标转换
        position.x = vector.x;
        position.y = vector.y;
        position.z = vector.z;
        const rotationQuaternion = new THREE.Quaternion(); //旋转转换
        const nullVector = new THREE.Vector3();
        TM.decompose(nullVector, rotationQuaternion, nullVector);
        const realrotation = new THREE.Euler().setFromQuaternion(rotationQuaternion, 'XYZ').z;
        const point = { x: position.x, y: position.y };
        parkingAreas.forEach((area, index) => {
            if (inside(point, area)) {
                carposARR[index].push(point);
                carscaleARR[index].push(scale);
                carrotARR[index].push(rotation.z - realrotation + Math.PI / 2);
            }
        });
    });
    filteredData.length = 0; 
    csvData.length = 0; 
    // console.log('position',carposARR);
    // console.log('rotation',carrotARR);
    // console.log('scale',carscaleARR);
    //klman filter
    const kfframe = [];
    const kfframerot = [];
    const kfframescale = [];

    Object.keys(carFilters).forEach(uid => {
        carFilters[uid].predict();
    });
    const allCarUIDs = new Set(Object.keys(carFilters)); 
    for ( let b = 0; b < parkingnumber; b++){            
                const kfarea = [];
                const kfrot = [];
                const kfscale = [];
                const updatedUIDs = new Set();
                for( let c = 0; c < carposARR[b].length; c++) {//该帧内的车位内部车辆编号
                    const pos = carposARR[b][c];
                    const uid = findClosestUID(b, pos);
                    // console.log('closestuid',uid);
                if (uid && carFilters[uid]) { 
                    carFilters[uid].update({x: pos.x, y: pos.y, rotation: carrotARR[b][c]});
                    carFilters[uid].setScale(carscaleARR[b][c]); // 更新缩放
                    // console.log('P matrix before accessing:', carFilters[uid].P);
                    const posXVariance = carFilters[uid].P.get([0, 0]);
                    const posYVariance = carFilters[uid].P.get([1, 1]);
                    const filteredRotation = carFilters[uid].rotation;
                    // console.log('cov',posXVariance);
                    // console.log('cov',posYVariance);
                    if (posXVariance < covarianceThreshold && posYVariance < covarianceThreshold) {
                        kfarea.push(pos);
                        kfrot.push(filteredRotation);
                        kfscale.push(carscaleARR[b][c]);
                        updatedUIDs.add(uid);
                    } 
                    else if  (posXVariance > covariancemaxThreshold || posYVariance > covariancemaxThreshold) {
                                delete carFilters[uid];
                                removeBoundingBox(uid);  // 定义一个函数用于从场景中移除
                    }
                } else {
                    const {x: normX, y: normY} = normalizeposition(pos.x, pos.y);
                    const newUID = generateUID(b, normX, normY);
                    const newFilter = new KalmanFilter([pos.x, pos.y], carrotARR[b][c], carscaleARR[b][c]);
                    carFilters[newUID] = newFilter;
                    initialPositions[newUID] = pos;
                    kfarea.push(pos);
                    kfrot.push(carrotARR[b][c]);
                    kfscale.push(carscaleARR[b][c]);
                    updatedUIDs.add(newUID);
                    }
                }; 
                allCarUIDs.forEach(uid => {
                    if (!updatedUIDs.has(uid) && uid.startsWith(`Lot${b}_`)) {
                        const filter = carFilters[uid];
                        // console.log(filter.x.size());
                        const predictedPos = {
                            x: filter.x.get([0, 0]),
                            y: filter.x.get([1, 0])
                        };
                        kfarea.push(predictedPos);
                        kfrot.push(filter.rotation);
                        kfscale.push(filter.scale);
                    }
                });
                const sortedIndices = kfarea.map((coord, index) => ({coord, index}))
                                .sort((a, b) => a.coord.x - b.coord.x)
                                .map(item => item.index);


                const sortedkfarea = sortedIndices.map(index => kfarea[index]);
                const sortedkfscale = sortedIndices.map(index => kfscale[index]);
                const sortedkfrot = sortedIndices.map(index => kfrot[index]);
                // console.log('skfarea',sortedkfarea);
                // console.log('skfscale',sortedkfscale);
                // console.log('skfrot',sortedkfrot);
                kfframe.push(sortedkfarea);
                kfframerot.push(sortedkfrot);
                kfframescale.push(sortedkfscale);
                // console.log('klfilter',carFilters);
                // console.log('kfpos',kfframe);
    }
    //render bounding box
    clearGroup(jsonscene);
    for ( let k = 0; k < parkingnumber; k++){
        for ( let l = 0; l < kfframe[k].length; l++){
            const boxGeometry = new THREE.BoxGeometry(kfframescale[k][l].x, kfframescale[k][l].y, kfframescale[k][l].z);
            const boxMaterial = new THREE.MeshBasicMaterial({
                color: 0xbb33FA,
                wireframe: true,
                visible: false
            });
            const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
            boxMesh.position.set(kfframe[k][l].x, kfframe[k][l].y, -26);
            boxMesh.rotation.set(0, 0, kfframerot[k][l]);
            const uid = generateUID(Math.round(kfframe[k][l].x), Math.round(kfframe[k][l].y));
            boxMesh.userData.uid = uid;
            // console.log(boxMesh);
            jsonscene.add(boxMesh);
        }
    }
    detect(parkingAreas, kfframe, kfframescale, carlength, freescene);
}


// async function loadJsonData(filePath1) {
//     const response = await fetch(filePath1);
//     const jsonData = await response.json();
//     dataCache.set(jsonData);
//     processJsonData(jsonData);
// }
async function processJsonData(frame, path){
    const index2 = String(frame).padStart(6, '0');
    const filePath1 = `${path}${index2}.json`;
    const response = await fetch(filePath1);
    const jsonDatatum = await response.json();
    dataCache.set(jsonDatatum);

    let tumcarposARR = Array.from({ length: parkingnumber }, () => []);
    let tumcarscaleARR = Array.from({ length: parkingnumber }, () => []);
    let tumcarrotARR = Array.from({ length: parkingnumber }, () => []);
    const filteredData = jsonDatatum.filter(data => data.obj_type !== "Pedestrian");

    filteredData.forEach(data => {
        const { position, scale, rotation } = data.psr;
        const { x, y, z } = data.psr.position;
        const vector = new THREE.Vector3(x, y, z);
        vector.applyMatrix4(TM); //位置坐标转换
        position.x = vector.x;
        position.y = vector.y;
        position.z = vector.z;
        const rotationQuaternion = new THREE.Quaternion(); //旋转转换
        const nullVector = new THREE.Vector3();
        TM.decompose(nullVector, rotationQuaternion, nullVector);
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

    filteredData.length = 0; 
    jsonDatatum.length = 0; 
    // console.log('position',carposARR);
    // console.log('rotation',carrotARR);
    // console.log('scale',carscaleARR);
    //klman filter
    const kfframe = [];
    const kfframerot = [];
    const kfframescale = [];

    Object.keys(carFilters).forEach(uid => {
        carFilters[uid].predict();
    });
    const allCarUIDs = new Set(Object.keys(carFilters)); 
    for ( let b = 0; b < parkingnumber; b++){            
                const kfarea = [];
                const kfrot = [];
                const kfscale = [];
                const updatedUIDs = new Set();
                for( let c = 0; c < tumcarposARR[b].length; c++) {//该帧内的车位内部车辆编号
                    const pos = tumcarposARR[b][c];
                    const uid = findClosestUID(b, pos);
                    // console.log('closestuid',uid);
                if (uid && carFilters[uid]) { 
                    carFilters[uid].update({x: pos.x, y: pos.y, rotation: tumcarrotARR[b][c]});
                    carFilters[uid].setScale(tumcarscaleARR[b][c]); // 更新缩放
                    const posXVariance = carFilters[uid].P.get([0, 0]);
                    const posYVariance = carFilters[uid].P.get([1, 1]);
                    const filteredRotation = carFilters[uid].rotation;
                    // console.log('cov',posXVariance);
                    // console.log('cov',posYVariance);
                    if (posXVariance < covarianceThreshold && posYVariance < covarianceThreshold) {
                        kfarea.push(pos);
                        kfrot.push(filteredRotation);
                        kfscale.push(tumcarscaleARR[b][c]);
                        updatedUIDs.add(uid);
                    } 
                    else if  (posXVariance > covariancemaxThreshold || posYVariance > covariancemaxThreshold) {
                                delete carFilters[uid];
                                removeBoundingBox(uid);  // 定义一个函数用于从场景中移除
                    }
                } else {
                    const {x: normX, y: normY} = normalizeposition(pos.x, pos.y);
                    const newUID = generateUID(b, normX, normY);
                    const newFilter = new KalmanFilter([pos.x, pos.y], tumcarrotARR[b][c], tumcarscaleARR[b][c]);
                    carFilters[newUID] = newFilter;
                    initialPositions[newUID] = pos;
                    kfarea.push(pos);
                    kfrot.push(tumcarrotARR[b][c]);
                    kfscale.push(tumcarscaleARR[b][c]);
                    updatedUIDs.add(newUID);
                    }
                }; 
                allCarUIDs.forEach(uid => {
                    if (!updatedUIDs.has(uid) && uid.startsWith(`Lot${b}_`)) {
                        const filter = carFilters[uid];
                        const predictedPos = {
                            x: filter.x.get([0, 0]),
                            y: filter.x.get([0, 1])
                        };
                        kfarea.push(predictedPos);
                        kfrot.push(filter.rotation);
                        kfscale.push(filter.scale);
                    }
                });
                const sortedIndices = kfarea.map((coord, index) => ({coord, index}))
                                .sort((a, b) => a.coord.x - b.coord.x)
                                .map(item => item.index);


                const sortedkfarea = sortedIndices.map(index => kfarea[index]);
                const sortedkfscale = sortedIndices.map(index => kfscale[index]);
                const sortedkfrot = sortedIndices.map(index => kfrot[index]);
                // console.log('skfarea',sortedkfarea);
                // console.log('skfscale',sortedkfscale);
                // console.log('skfrot',sortedkfrot);
                kfframe.push(sortedkfarea);
                kfframerot.push(sortedkfrot);
                kfframescale.push(sortedkfscale);
                // console.log('klfilter',carFilters);
                // console.log('kfpos',kfframe);
    }
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
            const uid = generateUID(Math.round(tumcarposARR[k][l].x), Math.round(tumcarposARR[k][l].y));
            boxMesh.userData.uid = uid;
            tumscene.add(boxMesh);
        }
    }
    detect(parkingAreas, kfframe, kfframescale, carlength, freescene);
}




function removeBoundingBox(uid) {
    const object = scene1.getObjectByName(uid);
    if (object) {
        scene.remove(object);
        if (object.geometry) object.geometry.dispose();
        if (object.material) object.material.dispose();
    }
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

function isPathClear(carpos, point, midPoint) {
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

//(判断空位)
function detect(parkingAreas, kfframe, kfframescale, carlength, freescene) {
        clearGroup(freescene);
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
            let angle = angles[j];
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
                    if (k > 0 && ( Math.abs(distance(kfframe[j][k-1], kfframe[j][k]) - (kfframescale[j][k-1].x / 2 + kfframescale[j][k].x / 2)) > carlength) ) {
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
                            if ( Math.abs(distance(kfframe[j][k], shortedges[p]) - (kfframescale[j][k].x / 2)) > carlength  &&
                                isPathClear(kfframe[j], kfframe[j][k], shortedges[p])) {
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

//kalman
let carFilters = {};
function normalizeposition(x, y) {
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);
    return {x: roundedX, y: roundedY};
}
function findClosestUID(parkingLotId, pos) {
    let minDistance = 3;
    let closestUID = null;
    Object.keys(initialPositions).forEach(uid => {
        if (uid.startsWith(`Lot${parkingLotId}`)) {
            const initialPos = initialPositions[uid];
            const dist = distance(pos, initialPos);
            if (dist < minDistance) {
                minDistance = dist;
                closestUID = uid;
            }
        }
    });
    return closestUID;
}
function generateUID(parkingLotId, roundedX, roundedY) {
    return `Lot${parkingLotId}_Pos${roundedX}_${roundedY}`;
}
class KalmanFilter {
    constructor(initialPos = [0, 0], initialRotation = 0, initialScale = { x: 1, y: 1, z: 1 }) {
        this.dt = 1; // 时间步长

        // 状态转移矩阵（考虑位置）
        this.F = math.matrix([
            [1, 0], 
            [0, 1]
        ]);

        this.H = math.matrix([
            [1, 0], // 观测x
            [0, 1]  // 观测y
        ]);

        this.Q = math.multiply(math.identity(2), 0.1);

        this.R = math.matrix([
            [0.01, 0],
            [0, 0.01]
        ]);

        this.x = math.matrix([[initialPos[0]], [initialPos[1]]]);
        this.rotation = initialRotation;
        this.scale = initialScale;
        // 初始协方差矩阵
        this.P = math.multiply(math.identity(2), 100);

        // 添加旋转的卡尔曼滤波器
        this.rotationFilter = {
            F: math.matrix([[1]]),
            H: math.matrix([[1]]),
            Q: math.matrix([[0.01]]),
            R: math.matrix([[0.1]]),
            x: math.matrix([[initialRotation]]),
            P: math.matrix([[100]])
        };
    }

    predict() {
        // 位置预测
        this.x = math.multiply(this.F, this.x);
        this.P = math.add(math.multiply(math.multiply(this.F, this.P), math.transpose(this.F)), this.Q);

        // 旋转预测
        this.rotationFilter.x = math.multiply(this.rotationFilter.F, this.rotationFilter.x);
        this.rotationFilter.P = math.add(
            math.multiply(math.multiply(this.rotationFilter.F, this.rotationFilter.P), math.transpose(this.rotationFilter.F)),
            this.rotationFilter.Q
        );
    }

    update(measurement) {
        const z = math.matrix([measurement.x, measurement.y]);
        const y = math.subtract(z, math.multiply(this.H, this.x)); // 残差
        const S = math.add(math.multiply(math.multiply(this.H, this.P), math.transpose(this.H)), this.R); // 残差协方差
        const K = math.multiply(math.multiply(this.P, math.transpose(this.H)), math.inv(S)); // 卡尔曼增益
        this.x = math.add(this.x, math.multiply(K, y)); // 更新状态
        const I = math.identity(math.size(this.F)._data[0]);
        this.P = math.multiply(math.subtract(I, math.multiply(K, this.H)), this.P); // 更新协方差

        // 旋转更新
        const zRotation = math.matrix([[measurement.rotation]]);
        const yRotation = math.subtract(zRotation, math.multiply(this.rotationFilter.H, this.rotationFilter.x));
        const SRotation = math.add(
            math.multiply(math.multiply(this.rotationFilter.H, this.rotationFilter.P), math.transpose(this.rotationFilter.H)),
            this.rotationFilter.R
        );
        const KRotation = math.multiply(math.multiply(this.rotationFilter.P, math.transpose(this.rotationFilter.H)), math.inv(SRotation));
        this.rotationFilter.x = math.add(this.rotationFilter.x, math.multiply(KRotation, yRotation));
        this.rotationFilter.P = math.multiply(math.subtract(math.identity(1), math.multiply(KRotation, this.rotationFilter.H)), this.rotationFilter.P);
        this.rotation = this.rotationFilter.x.get([0, 0]);
    }

    setRotation(rotation) {
        this.rotation = rotation;
    }

    setScale(scale) {
        this.scale = scale;
    }
}


//simulated vehicles
let edgeCoordinates = {};
let vehicleRoutes = {};
let vehicleDepartTimes = {};
let vehicleSpeeds = {};
const tumURL = '1080/osm.passenger.rou.xml';
const osmURL = '1080/osm.net.xml';   
// console.log('st',simulateTraffic);
if (simulateTraffic === true) { 
    vehicleRoutes = await fetchvehXMLFile(tumURL);
    edgeCoordinates = await fetchrouXMLFile(osmURL);
}

async function fetchvehXMLFile(url) {
    const response = await fetch(url);
    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");
    xmlDoc.querySelectorAll('vehicle').forEach(vehicle => {
        const vehicleId = vehicle.getAttribute('id');
        const departTime = parseFloat(vehicle.getAttribute('depart'));
        let departSpeed = vehicle.getAttribute('departSpeed');
        if (departSpeed === "max") {
            departSpeed = "max"; // 标记为max，以便稍后处理
        } else {
            departSpeed = parseFloat(departSpeed) || 0;
        }
        vehicleDepartTimes[vehicleId] = departTime;
        vehicleSpeeds[vehicleId] = departSpeed;
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
        [1, 0, 690747.906509577],
        [0, 1, 5335846.90492905],
        [0, 0, 1]
    ];
    xmlDoc.querySelectorAll('edge').forEach(edge => {
        const edgeId = edge.getAttribute('id');
        const lanes = edge.querySelectorAll('lane');
        lanes.forEach(lane => {
            const laneId = lane.getAttribute('id');
            const speedLimit = parseFloat(lane.getAttribute('speed'));
            const shape = lane.getAttribute('shape');
            if (shape) {
                const coordinates = shape.split(' ').map(coord => {
                    const [x, y] = coord.split(',').map(Number);
                    return applyTransformation(TFM, [x, y]);
                });
                if (!isNaN(speedLimit)) {
                    if (!edgeCoordinates[edgeId]) {
                        edgeCoordinates[edgeId] = [];
                    }
                    edgeCoordinates[edgeId].push({ coordinates, speedLimit });
                } else {
                    console.warn(`Speed limit is NaN for lane ${laneId} of edge ${edgeId}`);
                    edgeCoordinates[edgeId].push({ coordinates, speedLimit: 10 }); // 使用默认速度限制
                }
            }
        });
    });
    return edgeCoordinates;
}

function renderRoutes(vehicleRoutes, edgeCoordinates) {
    const paths = {};
    const pathsSpeeds = {};  // 新增，用于存储路径段的速度限制
    Object.entries(vehicleRoutes).forEach(([vehicleId, edges]) => {
        const points = [];
        const speeds = [];  // 用于存储每段路径的速度限制
        edges.forEach(edgeId => {
            if (edgeCoordinates[edgeId]) {
                // 选择最佳车道，假设选择第一个车道
                const lane = edgeCoordinates[edgeId][0]; 
                lane.coordinates.forEach(coord => {
                    if (coord && coord.length === 2) {  // 确保坐标有效
                        points.push(new THREE.Vector3(coord[0], coord[1], -24));
                    } else {
                        console.warn(`Invalid coordinate for edge ${edgeId}`, coord);
                    }
                });
                speeds.push(lane.speedLimit);  // 添加速度限制
            } else {
                console.warn(`Edge ${edgeId} not found in edgeCoordinates`);
            }
        });
        if (points.length > 0) {
            const path = new THREE.CatmullRomCurve3(points);
            paths[vehicleId] = path;
            pathsSpeeds[vehicleId] = speeds;  // 存储路径段的速度限制
        } else {
            console.warn(`No valid points found for vehicle ${vehicleId}`);
        }
    });
    return { paths, pathsSpeeds };
}


function applyTransformation(matrix, point) {
    const [x, y] = point;
    const homogeneousPoint = [x, y, 1];

    const transformedX = matrix[0][0] * homogeneousPoint[0] + matrix[0][1] * homogeneousPoint[1] + matrix[0][2] * homogeneousPoint[2];
    const transformedY = matrix[1][0] * homogeneousPoint[0] + matrix[1][1] * homogeneousPoint[1] + matrix[1][2] * homogeneousPoint[2];

    return [transformedX, transformedY];
}

// VEHICLE renderer
const vehicles = {};
const { paths, pathsSpeeds } = renderRoutes(vehicleRoutes, edgeCoordinates);
// console.log('paths',paths);
Object.keys(vehicleRoutes).forEach(vehicleId => {
    if (paths[vehicleId]) {
        const geometry = new THREE.BoxGeometry(3, 1.5, 2);  // 调整尺寸以匹配车辆的大小
        const material = new THREE.MeshBasicMaterial({ color: 0x00008e });  // 黑色材质
        const cube = new THREE.Mesh(geometry, material);

        vehicles[vehicleId] = {
            model: cube,
            path: paths[vehicleId],
            speeds: pathsSpeeds[vehicleId],  // 添加速度限制
            departTime: vehicleDepartTimes[vehicleId],
            speed: vehicleSpeeds[vehicleId],
            progress: 0,
            addedToScene: false,  // 标记车辆是否已添加到场景中
            completed: false,  // 标记车辆是否已完成行驶
            type: 'simulation'
        };

        // 设置模型的缩放比例，假设这个比例适合您的场景
        // vehicles[vehicleId].model.scale.set(0.03, 0.03, 0.03);
    } else {
        console.warn(`Path not found for vehicle ${vehicleId}`);
    }
});
// console.log(vehicles);

//Visualise

const revealedGroup = new THREE.Group();
scene1.add(revealedGroup);

let processedSingleFrame = false;
let simulationStartTime = performance.now();
let frame = 1;

let lastFrameTime = 0;
let frameInterval = 100;

function animate(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const elapsed = timestamp - lastFrameTime;  // 计算自上次帧的时间差

    // console.log('pcp',pointCloudPaths);
    // console.log('cf',currentFrame);
    if (elapsed >= frameInterval) {
        pointCloudPaths.forEach((group, groupIndex) => {
            const { path, count } = group;  // 提取路径和帧数
            if (!group.currentFrame) {
                group.currentFrame = 1;  // 初始化每组的 currentFrame
            }
    
            if (group.currentFrame <= count) {
                // 为每个组的点云加载，并确保每组独立管理自己的点云
                pcdload(group.currentFrame, path, groupIndex);
    
                // 更新当前帧
                group.currentFrame+=5;
    
                // 如果超过该组的最大帧数，则重置为1
                if (group.currentFrame > count) {
                    group.currentFrame = 1;
                }
            }
        });
        
        
        
        boundingBoxPaths.forEach(({ path, count }) => {
            // console.log('frame',frame);
            if (count === 1) {
                if (!processedSingleFrame) {  // 只有当还没有处理过单帧数据时才处理
                    frame = 1;
                    if (boundingBoxType === 'csv') {
                        processCsvData(frame, path);  // 处理 CSV 识别框
                    } else if (boundingBoxType === 'json') {
                        processJsonData(frame, path);  // 处理 JSON 识别框
                    }
                    processedSingleFrame = true;  // 标记单帧数据已处理
                }
            } 
            else {
    
            if (boundingBoxType === 'csv') {
                processCsvData(frame, path);  // 处理 CSV 识别框
            } else if (boundingBoxType === 'json') {
                processJsonData(frame, path);  // 处理 JSON 识别框
            }
    
            frame+=1;
        
            if (frame > count) {
                frame = 1;
            }
        }
        });
        lastFrameTime = timestamp;
    }
    const currentTime = (performance.now() - simulationStartTime) /1000;  // 以秒为单位的仿真时间


            Object.values(vehicles).forEach(vehicle => {
                if (currentTime >= vehicle.departTime && !vehicle.completed) {
                    if (!vehicle.addedToScene) {
                        scene1.add(vehicle.model);
                        vehicle.addedToScene = true;  // 标记车辆已添加到场景中
                    }
                    if (vehicle.path) {
                        const pathLength = vehicle.path.getLength();
                        const segmentIndex = Math.floor(vehicle.progress * vehicle.speeds.length);
                        const segmentSpeed = vehicle.speeds[segmentIndex] || vehicle.speed;  // 使用路径段的速度限制
                        const progressIncrement = segmentSpeed / pathLength * 0.05;  // 根据速度计算进度增量
                        vehicle.progress += progressIncrement;
                        if (vehicle.progress >= 1) {
                            vehicle.progress = 1;
                            vehicle.completed = true;  // 标记车辆已完成行驶
                            scene1.remove(vehicle.model);  // 从场景中移除车辆
                        }
                        const point = vehicle.path.getPointAt(vehicle.progress);
                        if (point) {
                            vehicle.model.position.copy(point);
                            const nextPoint = vehicle.path.getPointAt((vehicle.progress + 0.06) % 1);
                            if (nextPoint) {
                                vehicle.model.lookAt(nextPoint);
                                vehicle.model.up.set(0, 0, 1);
                                vehicle.model.rotateY(3*Math.PI / 2);
                                revealRectangles(point, nextPoint);
                            } else {
                                console.warn(`Next point not found for vehicle ${vehicle.model.name} at progress ${vehicle.progress}`);
                            }
                        } else {
                            console.warn(`Point not found for vehicle ${vehicle.model.name} at progress ${vehicle.progress}`);
                        }
                    } else {
                        console.warn(`Path not found for vehicle ${vehicle.model.name}`);
                    }
                }
            });


            if (trackingMode === 'vehicle' && currentVehicleId) {
                const vehicle = vehicles[currentVehicleId];
                if (vehicle && vehicle.addedToScene && !vehicle.completed) {
                    let targetPosition, targetLookAt;
            
                    if (vehicle.type === 'simulation') {
                        // 仿真车辆的追踪逻辑
                        targetPosition = vehicle.model.position.clone().add(new THREE.Vector3(-20, -60, 100));
                        targetLookAt = vehicle.model.position.clone();
                    } else if (vehicle.type === 'pointcloud') {
                        // 点云的追踪逻辑
                        targetPosition = vehicle.position.clone().add(new THREE.Vector3(-20, -60, 100));  // 使用点云的中心位置
                        targetLookAt = vehicle.position.clone();
                    }
            
                    // 更新相机位置和目标点
                    camera.position.lerp(targetPosition, 0.1);
                    camera.lookAt(targetLookAt);
                }
            }
        
    const currentTimeMillis = performance.now();
    revealedGroup.children.forEach(object => {
        const elapsedTime = (currentTimeMillis - object.userData.revealTime) / 1000;
        const lerpFactor = Math.min(1, elapsedTime / 15);
        object.material.color.lerpColors(object.userData.originalColor, new THREE.Color(0xffffff), lerpFactor);

        const colorThreshold = 0.9;  // 可以设置接近1的值来判断颜色接近白色
        const { r, g, b } = object.material.color;
    
        if (r > colorThreshold && g > colorThreshold && b > colorThreshold) {
            revealedGroup.remove(object);
            object.geometry.dispose();
            object.material.dispose();
        }
        });
    controls.update();
    
    renderer.render(scene1, camera);
    requestAnimationFrame(animate);
}
animate();

const processedUIDs = new Set();
const objectCooldowns = new Map();
const removedUIDs = new Set();
const allDetectedUIDs = new Set();

function revealRectangles(carPosition, nextCarPosition) {
    const currentTime = performance.now();
    const revealRadius = 40;
    let emptySpotRemoved = false;
    let emptySpotAdded = false;
    const lotUIDs = new Set(); // 用来跟踪已经处理过的uid
    const detectedUIDs = new Set();
    
freescene.children.forEach(mesh => {
    if (mesh.userData.uid) {
        lotUIDs.add(mesh.userData.uid);
    }
})
revealedGroup.children.forEach(object => {
    const uid = object.userData.uid;
    if (distance(nextCarPosition, object.position) < revealRadius) {
        if (!processedUIDs.has(uid)) {
            object.material.color.setHex(0x00ff00);  // 更新颜色
            processedUIDs.add(uid);
        }
        detectedUIDs.add(uid);  // 标记为已检测到
    }
});
    
    // 添加车后方20米范围内的对象
    scene.traverse(function (object) {

    

        if (object.isMesh && (object.geometry.type === 'BoxGeometry' || object.geometry.type === 'PlaneGeometry')) {
            const rectPosition = object.position;
            
            if (distance(carPosition, rectPosition) < revealRadius && distance(nextCarPosition, rectPosition) >= 40) {
                if (!object.material.visible) {
                    object.material.visible = true;
                    // console.log('cool',visualCooldown);
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

    detectedUIDs.forEach(uid => {
        allDetectedUIDs.add(uid);
    });

    // 移除当前检测范围内未被检测到的物体
    for (let i = revealedGroup.children.length - 1; i >= 0; i--) {
        const object = revealedGroup.children[i];
        const uid = object.userData.uid;

        // 如果该物体的uid曾被检测到，但现在在检测范围内却没有被检测到，则移除它
        if (distance(carPosition, object.position) < revealRadius && !detectedUIDs.has(uid) && allDetectedUIDs.has(uid)) {
            revealedGroup.remove(object);
            object.geometry.dispose();
            object.material.dispose();
            allDetectedUIDs.delete(uid);  // 从全局集合中移除
        }
    }
}



function updateOccupancyRate() {
    const occupancyRate = totalEmptySpotLength;
    occupancyRateElement.textContent = `Free lot number: ${(occupancyRate).toFixed(0)}`;
}

let toggleLegendButton = document.getElementById('toggleLegend');
let legendContainer = document.getElementById('legend');
let toggleInfoButton = document.getElementById('toggleInfo');
let infoBox = document.getElementById('infoBox');
toggleLegendButton.addEventListener('click', () => {
    const isLegendVisible = legendContainer.style.display === 'block';
    legendContainer.style.display = isLegendVisible ? 'none' : 'block';
});
toggleInfoButton.addEventListener('click', () => {
    const isInfoBoxVisible = infoBox.style.display === 'block';
    infoBox.style.display = isInfoBoxVisible ? 'none' : 'block';
});
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
function detectCurrentVehicles() {
    while (vehicleButtonsContainer.firstChild) {
        vehicleButtonsContainer.removeChild(vehicleButtonsContainer.firstChild);
    }

    Object.keys(vehicles).forEach(vehicleId => {
        if (vehicles[vehicleId].addedToScene && !vehicles[vehicleId].completed) {
            const button = document.createElement('div');
            button.className = 'vehicleButton';
            button.textContent = `Vehicle ${vehicleId}`;
            button.addEventListener('click', () => {
                currentVehicleId = vehicleId;
                trackingMode = 'vehicle';
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

    const geometry = new THREE.BoxGeometry(1, 0.5, 2);  // 长、宽、高的尺寸
    const material = new THREE.MeshBasicMaterial({ color: 0x00008e });  // 黑色材质
    const model = new THREE.Mesh(geometry, material);

    model.scale.set(1,1,1);  // 缩放模型
    legendScene.add(model);

    function animateLegend() {
        requestAnimationFrame(animateLegend);
        model.rotation.y += 0.01;  // 使模型旋转
        legendRenderer.render(legendScene, legendCamera);
    }
    animateLegend();
}
function renderLegendLidarModel() {
    // 获取 radarModelCanvas 用于渲染雷达模型
    const lidarCanvas = document.getElementById('lidarModelCanvas');
    const lidarRenderer = new THREE.WebGLRenderer({ canvas: lidarCanvas, alpha: true });
    lidarRenderer.setSize(50, 50);

    // 创建一个新的场景和相机用于图例渲染
    const lidarScene = new THREE.Scene();
    const lidarCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    lidarCamera.position.set(0, 1, 4);  // 设置摄像机位置
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);  // 白色环境光，强度为 0.5
    lidarScene.add(ambientLight);
    const loaderGLTF = new GLTFLoader();

    // 加载雷达模型并在图例中显示
    loaderGLTF.load('lidar.glb', function (gltf) {
        const lidarModel = gltf.scene;

        lidarModel.scale.set(0.05,0.05,0.05);  // 调整模型的缩放比例
        lidarModel.rotation.x =  Math.PI;
        lidarScene.add(lidarModel);  // 将模型添加到图例场景中

        // 创建动画使模型在图例中旋转
        function animateLidar() {
            requestAnimationFrame(animateLidar);
            lidarModel.rotation.y += 0.01;  // 模型缓慢旋转
            lidarRenderer.render(lidarScene, lidarCamera);  // 渲染模型
        }
        animateLidar();
    });
}



renderLegendModel()
// renderLegendLidarModel()