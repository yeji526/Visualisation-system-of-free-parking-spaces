import open3d as o3d
import numpy as np
import os

def make_point_cloud_sparse(input_file, output_file, sparsity_ratio):
    # 读取点云
    pcd = o3d.io.read_point_cloud(input_file)

    # 获取点云中的点和颜色
    points = np.asarray(pcd.points)
    colors = np.asarray(pcd.colors)

    # 按照稀疏率选择点
    num_points = points.shape[0]
    indices = np.random.choice(num_points, int(num_points * sparsity_ratio), replace=False)
    sparse_points = points[indices]
    sparse_colors = colors[indices]

    # 创建新的稀疏点云
    sparse_pcd = o3d.geometry.PointCloud()
    sparse_pcd.points = o3d.utility.Vector3dVector(sparse_points)
    sparse_pcd.colors = o3d.utility.Vector3dVector(sparse_colors)

    # 保存稀疏点云
    o3d.io.write_point_cloud(output_file, sparse_pcd)

def batch_process(input_dir, output_dir, sparsity_ratio):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    for filename in os.listdir(input_dir):
        if filename.endswith(".pcd"):
            input_file = os.path.join(input_dir, filename)
            output_file = os.path.join(output_dir, filename)
            make_point_cloud_sparse(input_file, output_file, sparsity_ratio)
            print(f"Processed {input_file} and saved to {output_file}")

# 示例使用
input_directory = 'tum_dynamic/veh5/'
output_directory = 'tum_dynamic/veh41/'
sparsity_ratio = 0.0125  # 保留原始点云的10%

batch_process(input_directory, output_directory, sparsity_ratio)
