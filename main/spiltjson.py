import json
import csv
import math
import os

# Transformation matrix
transformation_matrix = [
    [0.999546221400587, -0.0330742414374746, 691041.248379479],
    [0.0329858862269359, 0.998920300148719, 5336089.81812224],
    [0, 0, 1]
]

# Function to apply the transformation matrix to a point (x, y)
def apply_transformation(x, y):
    x_new = transformation_matrix[0][0] * x + transformation_matrix[0][1] * y + transformation_matrix[0][2]
    y_new = transformation_matrix[1][0] * x + transformation_matrix[1][1] * y + transformation_matrix[1][2]
    return x_new, y_new

# Function to calculate the distance between two points
def calculate_distance(x1, y1, x2, y2):
    return math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)

# Load the vehicle data from the JSON file
with open('MLS2018_Arcisstr_instance_20cm_full_1.json', 'r') as json_file:
    vehicle_data = json.load(json_file)

# Load the points from the CSV file (these points remain unchanged)
points = []
with open('vehicle_positions1.csv', 'r') as csv_file:
    csv_reader = csv.reader(csv_file)
    next(csv_reader)  # Skip the header if there is one
    for row in csv_reader:
        x, y = float(row[0]), float(row[1])
        points.append((x, y))

# Create a directory to store the output files
output_dir = 'tum_dynamic/json1/'
os.makedirs(output_dir, exist_ok=True)

# Process each point
for idx, (point_x, point_y) in enumerate(points):
    filtered_vehicles = []
    
    # Debug: Print the original point (no transformation applied to the point)
    print(f"Processing Point {idx + 1}: ({point_x}, {point_y})")
    
    # Check each vehicle in the JSON file
    for vehicle in vehicle_data:
        vehicle_x = vehicle['psr']['position']['x']
        vehicle_y = vehicle['psr']['position']['y']
        
        # Apply transformation to vehicle coordinates
        vehicle_x_trans, vehicle_y_trans = apply_transformation(vehicle_x, vehicle_y)
        
        # Debug: Print transformed vehicle coordinates
        print(f"Vehicle: Original ({vehicle_x}, {vehicle_y}), Transformed ({vehicle_x_trans}, {vehicle_y_trans})")
        
        # If the vehicle is within 40m of the point, add it to the list
        distance = calculate_distance(vehicle_x_trans, vehicle_y_trans, point_x, point_y)  # Keep point_x, point_y unchanged
        print(f"Distance: {distance}")  # Debug: Print the distance
        
        if distance <= 40:
            filtered_vehicles.append(vehicle)
    
    # Save the filtered vehicles to a new JSON file if there are any
    if filtered_vehicles:
        output_file = os.path.join(output_dir, f'vehicles_near_point_{idx+1}.json')
        with open(output_file, 'w') as outfile:
            json.dump(filtered_vehicles, outfile, indent=4)

print("Processing complete. Check output or logs for debug info.")
