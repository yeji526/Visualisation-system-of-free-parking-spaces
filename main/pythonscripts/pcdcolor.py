import open3d as o3d
import numpy as np
import os

def hex_to_rgb(hex_color):
    """将十六进制颜色码转换为0到1之间的RGB浮点数列表。"""
    hex_color = hex_color.lstrip('#')
    return [int(hex_color[i:i+2], 16) / 255.0 for i in (0, 2 ,4)]

# 使用十六进制颜色码定义新的颜色
hex_color_code = '808080'
new_color = hex_to_rgb(hex_color_code)

# 输入点云文件的目录
input_directory = './0620/data/'

# 输出修改后点云文件的目录
output_directory = './0620/data/'

# 如果输出目录不存在，创建它
if not os.path.exists(output_directory):
    os.makedirs(output_directory)

# 检查输入目录是否存在
if not os.path.exists(input_directory):
    print(f'输入目录不存在：{input_directory}')
    exit(1)

# 使用 os.walk 遍历所有子目录和文件
for root, dirs, files in os.walk(input_directory):
    for filename in files:
        if filename.lower().endswith('.pcd'):
            input_path = os.path.join(root, filename)
            
            # 计算相对路径，保持目录结构
            relative_path = os.path.relpath(root, input_directory)
            output_subdir = os.path.join(output_directory, relative_path)
            if not os.path.exists(output_subdir):
                os.makedirs(output_subdir)
            output_path = os.path.join(output_subdir, filename)
            
            # 读取点云
            try:
                pcd = o3d.io.read_point_cloud(input_path)
                if pcd.is_empty():
                    print(f'点云为空：{input_path}')
                    continue
            except Exception as e:
                print(f'读取点云失败：{input_path}')
                print(f'错误信息：{e}')
                continue
            
            # 设置新的颜色
            num_points = np.asarray(pcd.points).shape[0]
            colors = np.tile(new_color, (num_points, 1))
            pcd.colors = o3d.utility.Vector3dVector(colors)
    
            # 保存修改后的点云
            try:
                o3d.io.write_point_cloud(output_path, pcd)
                print(f'已处理文件：{output_path}')
            except Exception as e:
                print(f'保存点云失败：{output_path}')
                print(f'错误信息：{e}')
                continue

print('所有PCD文件已处理完毕。')
