import os

path = "./tum_dynamic/veh41/"

files = [f for f in os.listdir(path) if f.endswith('.pcd')]

files.sort(key=lambda f: int(f.split('_')[-1].split('.')[0]))

for i, filename in enumerate(files):

    new_filename = f"{str(i + 1).zfill(6)}.pcd"
    
    old_file = os.path.join(path, filename)
    new_file = os.path.join(path, new_filename)
    
    os.rename(old_file, new_file)

    print(f"Renamed: {filename} -> {new_filename}")