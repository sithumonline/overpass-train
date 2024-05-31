self.onmessage = async function (event) {
  let _data = event.data.data;
  let firstRoute = event.data.firstRoute;
  let txtCoor = [];
  const railwayTracks = _data.elements
    .filter(
      (element) => element.type === "way" && element.tags?.railway === "rail"
    )
    .map((element) =>
      element.nodes.map((node) => _data.elements.find((e) => e.id === node))
    );

  console.log("worker started", firstRoute.coordinates.length);

  for (let index = 0; index < firstRoute.coordinates.length; index++) {
    let coordinate = firstRoute.coordinates[index];
    let trainLat = coordinate.lat;
    let trainLon = coordinate.lng;

    console.log(
      "firstRoute started",
      `${firstRoute.coordinates.length} / ${index}`
    );

    let distanceFromRailwayTrack = Number.MAX_VALUE;
    let nearestRailwayTrack = null;

    for (let railwayTrack of railwayTracks) {
      let distance = Number.MAX_VALUE;
      for (let i = 0; i < railwayTrack.length - 1; i++) {
        let node1 = railwayTrack[i];
        let node2 = railwayTrack[i + 1];
        let lat1 = node1.lat;
        let lon1 = node1.lon;
        let lat2 = node2.lat;
        let lon2 = node2.lon;
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
        nearestRailwayTrack = railwayTrack;
      }

      let txt = `<b>Train Location</b><br>Latitude: ${trainLat}<br>Longitude: ${trainLon}<br>`;

      if (nearestRailwayTrack != null) {
        txt += nearestRailwayTrack.tags?.name
          ? `Nearest Railway Track: ${nearestRailwayTrack.tags?.name}`
          : `NoName`;
      }

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
