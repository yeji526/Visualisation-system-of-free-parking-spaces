import numpy as np
import pandas as pd
import open3d as o3d

# 读取CSV文件
csv_file_path = 'vehicle_positions5.csv'
coordinates = pd.read_csv(csv_file_path)

# 给定的逆矩阵
inverse_matrix = np.array([
    [9.99362024e-01, 3.30888669e-02, 0.00000000e+00, -8.67165546e+05],
    [-3.30004726e-02, 9.99988222e-01, 0.00000000e+00, -5.31322228e+06],
    [0.00000000e+00, 0.00000000e+00, 1.00000000e+00, 0.00000000e+00],
    [0.00000000e+00, 0.00000000e+00, 0.00000000e+00, 1.00000000e+00]
])

# 对CSV文件中的坐标进行转换
transformed_coordinates = []
for index, row in coordinates.iterrows():
    point = np.array([row[0], row[1], row[2], 1])  # 假设CSV文件中每行包含 x, y, z 三个坐标
    transformed_point = np.dot(inverse_matrix, point)
    transformed_coordinates.append(transformed_point[:3])  # 只取前三个坐标

transformed_coordinates_df = pd.DataFrame(transformed_coordinates, columns=['x', 'y', 'z'])

# 读取点云数据文件
pcd_file_path = 'class.pcd'  # 替换为你的点云文件路径
pcd = o3d.io.read_point_cloud(pcd_file_path)

# 对每个转换后的坐标进行分割，并保存结果
radius = 40.0  # 半径20米
for i, point in transformed_coordinates_df.iterrows():
    center = point.to_numpy()
    # 计算距离，留下半径20米内的点
    distances = np.linalg.norm(np.asarray(pcd.points) - center, axis=1)
    mask = distances < radius
    segmented_pcd = pcd.select_by_index(np.where(mask)[0])
    
    # 保存分割后的点云数据
    output_file_path = f'./tum_dynamic/veh5/segmented_pointcloud_{i}.pcd'  # 替换为保存路径
    o3d.io.write_point_cloud(output_file_path, segmented_pcd)

print("点云分割及保存完成。")
