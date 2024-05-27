self.onmessage = async function (event) {
  let _data = event.data.data;
  let firstRoute = event.data.firstRoute;
  let txtCoor = [];

  console.log("worker started", firstRoute.coordinates.length);

  for (let index = 0; index < firstRoute.coordinates.length; index++) {
    let coordinate = firstRoute.coordinates[index];
    trainLat = coordinate.lat;
    trainLon = coordinate.lng;

    console.log(
      "firstRoute started",
      `${firstRoute.coordinates.length} / ${index}`
    );

    let nearestStation = null;
    let nearestDistance = Number.MAX_VALUE;
    let distanceFromRailwayTrack = Number.MAX_VALUE;
    let nearestRailwayTrack = null;

    for (let element of _data.elements) {
      if (!element.tags) {
        continue;
      }
      if (element.type == "node" && element.tags.railway == "station") {
        let stationLat = element.lat;
        let stationLon = element.lon;
        let distance = Math.sqrt(
          Math.pow(stationLat - trainLat, 2) +
            Math.pow(stationLon - trainLon, 2)
        );
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestStation = element;
        }
      } else if (element.type == "way") {
        let railwayTrack = element;
        let distance = Number.MAX_VALUE;
        for (let i = 0; i < railwayTrack.nodes.length - 1; i++) {
          let node1 = railwayTrack.nodes[i];
          let node2 = railwayTrack.nodes[i + 1];
          let lat1 = _data.elements.find((e) => e.id == node1)?.lat;
          let lon1 = _data.elements.find((e) => e.id == node1)?.lon;
          let lat2 = _data.elements.find((e) => e.id == node2)?.lat;
          let lon2 = _data.elements.find((e) => e.id == node2)?.lon;
          if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
            continue;
          }
          let x0 = trainLon;
          let y0 = trainLat;
          let x1 = lon1;
          let y1 = lat1;
          let x2 = lon2;
          let y2 = lat2;
          let distanceFromLine =
            Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1) /
            Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));
          if (distanceFromLine < distance) {
            distance = distanceFromLine;
          }
        }
        if (distance < distanceFromRailwayTrack) {
          distanceFromRailwayTrack = distance;
          nearestRailwayTrack = element;
        }
      }

      let txt = `<b>Train Location</b><br>Latitude: ${trainLat}<br>Longitude: ${trainLon}<br>`;

      if (nearestStation != null) {
        txt += nearestStation.tags?.name
          ? `Nearest Station: ${nearestStation.tags?.name}`
          : ``;
      }
      if (nearestRailwayTrack != null) {
        txt += nearestStation && nearestRailwayTrack.tags?.name ? `<br>` : "";
        txt += nearestRailwayTrack.tags?.name
          ? `Nearest Railway Track: ${nearestRailwayTrack.tags?.name}`
          : ``;
      }

      // trainMarker.bindPopup(txt).openPopup();
      txtCoor.push({
        latLng: { lat: trainLat, lng: trainLon },
        txt: txt,
      });
    }

    console.log("firstRoute ended", index);
  }

  console.log("worker ended");

  self.postMessage(txtCoor);
};
