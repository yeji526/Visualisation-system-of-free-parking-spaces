import os
import pandas as pd

# 请将此路径修改为你要读取的CSV文件的路径
file_path = './0619.3/csv/mec_20220421_151620_00006.csv'

# 读取CSV文件
data = pd.read_csv(file_path)

# 创建保存子文件的目录
output_dir = './0619.3/bb/'
os.makedirs(output_dir, exist_ok=True)

# 按时间戳分组并保存每个组为单独的CSV文件
for timestamp, group in data.groupby('timestamp'):
    # 使用原始时间戳作为文件名
    file_name = os.path.join(output_dir, f'{timestamp}.csv')
    
    # 保存分组数据到CSV文件
    group.to_csv(file_name, index=False)