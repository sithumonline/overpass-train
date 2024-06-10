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

    if (
      index + 1 >= firstRoute.coordinates.length ||
      trainLat == null ||
      trainLon == null
    ) {
      continue;
    }

    let trainDirection = calculateBearing(
      trainLat,
      trainLon,
      firstRoute.coordinates[index + 1].lat,
      firstRoute.coordinates[index + 1].lng
    );

    console.log(
      "firstRoute started",
      `${firstRoute.coordinates.length} / ${index}`
    );

    let nearestRailwayTrack = findNearestRailwayTrack(
      railwayTracks,
      trainLat,
      trainLon,
      trainDirection
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

function findNearestRailwayTrack(
  railwayTracks,
  trainLat,
  trainLon,
  trainDirection
) {
  let distanceFromRailwayTrack = Number.MAX_VALUE;
  let nearestRailwayTrack = null;
  let nearestRailwayCoordinate = null;
  let nearestRailwayAngle = null;

  for (let railwayTrack of railwayTracks) {
    let distance = findNearestDistance(
      railwayTrack,
      trainLat,
      trainLon,
      trainDirection
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

function findNearestDistance(railwayTrack, trainLat, trainLon, trainDirection) {
  let distance = Number.MAX_VALUE;
  let coordinate = null;
  let angle = null;

  for (let i = 0; i < railwayTrack.nodes.length - 1; i++) {
    let node1 = railwayTrack.nodes[i];
    let node2 = railwayTrack.nodes[i + 1];
    let lat1 = node1.lat;
    let lon1 = node1.lon;
    let lat2 = node2.lat;
    let lon2 = node2.lon;
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
      continue;
    }

    let distance1 = haversine(
      { lat: trainLat, lon: trainLon },
      { lat: lat1, lon: lon1 }
    );
    let distance2 = haversine(
      { lat: trainLat, lon: trainLon },
      { lat: lat2, lon: lon2 }
    );
    let distance3 = haversine(
      { lat: lat1, lon: lon1 },
      { lat: lat2, lon: lon2 }
    );

    let distanceFromLine = 0;
    if (distance1 <= distance3 && distance2 <= distance3) {
      let s = (distance1 + distance2 + distance3) / 2;
      distanceFromLine =
        (2 *
          Math.sqrt(s * (s - distance1) * (s - distance2) * (s - distance3))) /
        distance3;
    } else {
      distanceFromLine = Math.min(distance1, distance2);
    }

    if (distanceFromLine < distance) {
      distance = distanceFromLine;
      coordinate = { lat: lat1, lng: lon1 };

      // Calculate angle between train direction and railway segment
      let trainVector = {
        x: Math.cos(toRad(trainDirection)),
        y: Math.sin(toRad(trainDirection)),
      };
      let segmentVector = { x: lon2 - lon1, y: lat2 - lat1 };

      let dotProduct =
        trainVector.x * segmentVector.x + trainVector.y * segmentVector.y;
      let trainVectorMagnitude = Math.sqrt(
        trainVector.x ** 2 + trainVector.y ** 2
      );
      let segmentVectorMagnitude = Math.sqrt(
        segmentVector.x ** 2 + segmentVector.y ** 2
      );

      let cosineOfAngle =
        dotProduct / (trainVectorMagnitude * segmentVectorMagnitude);
      angle = Math.acos(cosineOfAngle) * (180 / Math.PI);
    }
  }

  return { distance, coordinate, angle };
}

const toRad = (x) => (x * Math.PI) / 180; // Helper function for angle conversion

function toDeg(radians) {
  return (radians * 180) / Math.PI;
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  let φ1 = toRad(lat1);
  let φ2 = toRad(lat2);
  let Δλ = toRad(lon2 - lon1);

  let y = Math.sin(Δλ) * Math.cos(φ2);
  let x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  let θ = Math.atan2(y, x);

  return (toDeg(θ) + 360) % 360; // Normalize to 0-360 degrees
}
