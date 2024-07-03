import os
from datetime import datetime
from pymongo import MongoClient
import matplotlib.pyplot as plt


def get_data(query=None):
    client = MongoClient(os.environ['MONGODB_URI'])
    db = client['test']
    collection = db['trains']
    data = collection.find(query)
    return data

# {'_id': ObjectId('xx'), 'trainId': '8736', 'deviceId': 'xx', 'timestamp': datetime.datetime(2024, 7, 1, 12, 49, 32, 119000), 'distance': 3095456.2133020214, 'angle': 318.7754843090239, 'location': {'type': 'Point', 'coordinates': [79.8683553, 6.8103146]}, '__v': 0}
# {'_id': ObjectId('xx'), 'trainId': '8736', 'deviceId': 'xx', 'timestamp': datetime.datetime(2024, 7, 1, 12, 49, 36, 241000), 'distance': 3095437.556339438, 'angle': 318.77510717367545, 'location': {'type': 'Point', 'coordinates': [79.8683553, 6.8103146]}, '__v': 0}
# {'_id': ObjectId('xx'), 'trainId': '8736', 'deviceId': 'xx', 'timestamp': datetime.datetime(2024, 7, 1, 12, 49, 39, 496000), 'distance': 3095437.556339438, 'angle': 318.77510717367545, 'location': {'type': 'Point', 'coordinates': [79.8683553, 6.8103146]}, '__v': 0}

def plot_data(data):
    x = []
    y1 = []
    y2 = []
    for d in data:
        x.append(d['timestamp'])
        y1.append(d['distance'])
        y2.append(d['angle'])
    plt.plot(x, y1, label='distance')
    plt.plot(x, y2, label='angle')
    plt.show()

def main():
    data = get_data({'timestamp': {'$gte': datetime(2024, 7, 1)}})
    plot_data(data)

