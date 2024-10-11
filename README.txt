This is the guidance to the operation of the vacant parking detection and visualisation system. （Windows）

1. Install 'Node.js' by using the prebuilt installer named 'node-v20.17.0-x64.msi'. Follow the instruction of the installer, it will install the 'node.js' in your computer.

2. Press 'Win' + 'R', open 'Powershell'.

3. Change the path to the 'main' folder.

4. Type 'npx vite', the system will return an address. Copy the address and paste it into the browser.

5. The system is displayed now in the browser.

In this thesis, two scenarios are built. Users may switch the scenarios by editing the 'Config.txt' file in the main folder. Or if users want to visualise new data, it can also be done by editing the 'Config.txt' file. Simply put the path of the data following the format, system will read the data and process them. The structure follows:

Transformation matrix (need to calculate)

Point cloud file path, number of point cloud files (only support pcd files)

bounding box data type (json or csv)

bounding box data file path, number of bounding box files

simulate traffic or not
