import haversine from "haversine-distance";
import kdbush from "kdbush";
import * as geokdbush from "geokdbush-tk";

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

  const _index = new kdbush(
    railwayTracks.flatMap((track) => track.nodes).length
  );

  railwayTracks.forEach((track) => {
    track.nodes.forEach((node) => {
      _index.add(node.lon, node.lat);
    });
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

    const nearestIds = geokdbush.around(_index, trainLat, trainLon, 1);
    const nearestPoints = nearestIds.map(
      (id) => railwayTracks.flatMap((track) => track.nodes)[id]
    );
    const nearTrack = railwayTracks.find((track) =>
      track.nodes.some((node) => nearestPoints.includes(node))
    );
    const nearDistance = findNearestDistance(nearTrack, trainLat, trainLon);

    /*
    let nearestRailwayTrack = findNearestRailwayTrack(
      railwayTracks,
      trainLat,
      trainLon
    );

    console.log(
      "nearestRailwayTrack",
      nearestRailwayTrack,
      "nearTrack",
      nearTrack,
      "nearDistance",
      nearDistance
    );
    */

    let nearestRailwayTrack = {
      distance: nearDistance,
      track: nearTrack,
    };

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
    });

    console.log("firstRoute ended", index);
  }

  console.log("worker ended");

  self.postMessage(txtCoor);
};

/*
function findNearestRailwayTrack(railwayTracks, trainLat, trainLon) {
  let distanceFromRailwayTrack = Number.MAX_VALUE;
  let nearestRailwayTrack = null;

  for (let railwayTrack of railwayTracks) {
    let distance = findNearestDistance(railwayTrack, trainLat, trainLon);
    if (distance < distanceFromRailwayTrack) {
      distanceFromRailwayTrack = distance;
      nearestRailwayTrack = railwayTrack;
    }
  }

  return { distance: distanceFromRailwayTrack, track: nearestRailwayTrack };
}
*/

function findNearestDistance(railwayTrack, trainLat, trainLon) {
  let distance = Number.MAX_VALUE;

  for (let i = 0; i < railwayTrack.nodes.length - 1; i++) {
    // rewrite with haversine
    /*
      steps:
      1. get the distance between train and node1
      2. get the distance between train and node2
      3. get the distance between node1 and node2
      4. calculate the distance between train and line
    */

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
    }
  }

  return distance;
}
