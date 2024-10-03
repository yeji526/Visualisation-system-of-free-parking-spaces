
import os
import glob

# 请将此路径修改为包含 .pcd 文件的目录路径
directory = './0619.3/pcd/'

# 获取所有 .pcd 文件的路径
pcd_files = glob.glob(os.path.join(directory, '*.pcd'))

for file_path in pcd_files:
    # 获取文件名
    file_name = os.path.basename(file_path)
    
    # 去除文件扩展名，提取小数点前和小数点后三部分
    base_name, ext = os.path.splitext(file_name)
    if '.' in base_name:
        main_part, decimal_part = base_name.split('.')
        # 将小数部分转为浮点数再进行四舍五入
        rounded_decimal = round(float(f'0.{decimal_part}'), 1)
        # 格式化保留两位小数，不足两位补0
        new_base_name = f'{main_part}.{int(rounded_decimal*10):01d}'
    else:
        new_base_name = base_name
    
    # 新文件名
    new_file_name = f'{new_base_name}{ext}'
    
    # 新文件路径
    new_file_path = os.path.join(directory, new_file_name)
    
    # 重命名文件
    os.rename(file_path, new_file_path)

print("文件重命名完成")