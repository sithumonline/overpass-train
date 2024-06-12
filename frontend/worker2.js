import haversine from "haversine-distance";

self.onmessage = async function (event) {
  let _data = event.data.data;
  let firstRoute = event.data.firstRoute;
  let txtCoor = [];

  const railwayTracks = _data.elements
    .filter(
      (element) => element.type === "way" && element.tags?.railway === "rail"
    )
    .map((element) => {
      return {
        ...element,
        nodes: element.nodes.map((node) =>
          _data.elements.find((e) => e.id === node)
        ),
      };
    });

  console.log("worker started", firstRoute.coordinates.length);

  for (let index = 0; index < firstRoute.coordinates.length; index++) {
    let coordinate = firstRoute.coordinates[index];
    let trainLat = coordinate.lat;
    let trainLon = coordinate.lng;

    console.log(
      "firstRoute started",
      `${firstRoute.coordinates.length} / ${index}`
    );

    let nearestRailwayTrack = findNearestRailwayTrack(
      railwayTracks,
      trainLat,
      trainLon
    );

    let txt = `<b>Train Location</b><br>Latitude: ${trainLat}<br>Longitude: ${trainLon}<br>Distance : ${nearestRailwayTrack.distance.toFixed(
      6
    )}<br>`;

    if (nearestRailwayTrack.track != null) {
      txt += nearestRailwayTrack.track.tags?.name
        ? `Nearest Railway Track: ${nearestRailwayTrack.track.tags?.name}`
        : `NoName`;
    }

    txtCoor.push({
      latLng: { lat: trainLat, lng: trainLon },
      txt: txt,
      distance: nearestRailwayTrack.distance,
      coordinate: {
        lat: nearestRailwayTrack.coordinate.lat,
        lng: nearestRailwayTrack.coordinate.lng,
      },
      angle: nearestRailwayTrack.angle,
    });

    console.log("firstRoute ended", index);
  }

  console.log("worker ended");

  self.postMessage(txtCoor);
};

function findNearestRailwayTrack(railwayTracks, trainLat, trainLon) {
  let distanceFromRailwayTrack = Number.MAX_VALUE;
  let nearestRailwayTrack = null;
  let nearestRailwayCoordinate = null;
  let nearestRailwayAngle = null;

  for (let railwayTrack of railwayTracks) {
    let distance = findSecondNearestNodeCoordinates(
      railwayTrack,
      trainLat,
      trainLon
    );
    if (distance.distance < distanceFromRailwayTrack) {
      distanceFromRailwayTrack = distance.distance;
      nearestRailwayTrack = railwayTrack;
      nearestRailwayCoordinate = distance.coordinate;
      nearestRailwayAngle = distance.angle;
    }
  }

  return {
    distance: distanceFromRailwayTrack,
    track: nearestRailwayTrack,
    coordinate: nearestRailwayCoordinate,
    angle: nearestRailwayAngle,
  };
}

function findSecondNearestNodeCoordinates(railwayTrack, trainLat, trainLon) {
  let nearestDistance = Number.MAX_VALUE;
  let secondNearestDistance = Number.MAX_VALUE;
  let nearestCoordinate = null;
  let secondNearestCoordinate = null;

  for (let i = 0; i < railwayTrack.nodes.length; i++) {
    let node = railwayTrack.nodes[i];
    let lat = node.lat;
    let lon = node.lon;

    if (lat == null || lon == null) {
      continue;
    }

    let distance = haversine(
      { lat: trainLat, lon: trainLon },
      { lat: lat, lon: lon }
    );

    if (distance < nearestDistance) {
      // Update second nearest to be the previous nearest
      secondNearestDistance = nearestDistance;
      secondNearestCoordinate = nearestCoordinate;

      // Update nearest
      nearestDistance = distance;
      nearestCoordinate = { lat: lat, lng: lon };
    } else if (distance < secondNearestDistance) {
      // Update second nearest
      secondNearestDistance = distance;
      secondNearestCoordinate = { lat: lat, lng: lon };
    }
  }

  let angle = calculateAngle(nearestCoordinate, {
    lat: trainLat,
    lng: trainLon,
  });

  return { distance: nearestDistance, coordinate: nearestCoordinate, angle };
}

// Function to calculate the bearing (angle) from coordinate1 to coordinate2
function calculateAngle(coord1, coord2) {
  let lat1 = (coord1.lat * Math.PI) / 180;
  let lon1 = (coord1.lng * Math.PI) / 180;
  let lat2 = (coord2.lat * Math.PI) / 180;
  let lon2 = (coord2.lng * Math.PI) / 180;

  let dLon = lon2 - lon1;

  let y = Math.sin(dLon) * Math.cos(lat2);
  let x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  let brng = Math.atan2(y, x);
  brng = (brng * 180) / Math.PI;
  brng = (brng + 360) % 360;

  return brng;
}
