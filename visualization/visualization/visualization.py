import os
import math
from datetime import datetime
from pymongo import MongoClient
import matplotlib.pyplot as plt
import plotly.express as px


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
    y = []
    lat1 = 0
    lon1 = 0
    for d in data:
        lon2, lat2 = d['location']['coordinates']
        if lat1 == 0 and lon1 == 0:
            lat1, lon1 = lat2, lon2
            continue
        x.append(d['timestamp'])
        y.append(math.sqrt((lat2 - lat1)**2 + (lon2 - lon1)**2))
        lat1, lon1 = lat2, lon2

    plt.plot(x, y)
    plt.show()


def plot_data_plotly(data):
    # show longitude and latitude on a map
    lon = []
    lat = []
    for d in data:
        lon.append(d['location']['coordinates'][0])
        lat.append(d['location']['coordinates'][1])

    fig = px.scatter_mapbox(lat=lat, lon=lon, zoom=10)
    fig.update_layout(mapbox_style="open-street-map")
    fig.show()

def main():
    data = get_data({'timestamp': {'$gte': datetime(2024, 7, 1)}})
    # plot_data(data)
    plot_data_plotly(data)

