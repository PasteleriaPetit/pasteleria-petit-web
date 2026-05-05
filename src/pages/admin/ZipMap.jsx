import {MapContainer,TileLayer,CircleMarker,Popup,useMapEvents} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import "leaflet/dist/leaflet.css";

export default function ZipMap() {
  const [data, setData] = useState([]);
  const [zoom, setZoom] = useState(5);

  // 🎯 Detectar zoom dinámico
  function ZoomHandler() {
    useMapEvents({
      zoomend: (e) => {
        setZoom(e.target.getZoom());
      },
    });
    return null;
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const zipSnap = await getDocs(collection(db, "zipCodes"));
        const geoSnap = await getDocs(collection(db, "zipGeo"));

        // 🔢 Contar visitas por código postal
        const counts = {};
        zipSnap.forEach((doc) => {
          const zip = doc.data().zip;
          if (!zip) return;
          counts[zip] = (counts[zip] || 0) + 1;
        });

        // 🗺️ Unir con coordenadas
        const points = [];
        geoSnap.forEach((doc) => {
          const geo = doc.data();
          const zip = doc.id;

          if (counts[zip]) {
            points.push({
              zip,
              lat: geo.lat,
              lng: geo.lng,
              count: counts[zip],
            });
          }
        });

        setData(points);
      } catch (err) {
        console.error("Error cargando mapa:", err);
      }
    };

    loadData();
  }, []);

  // 📏 Tamaño adaptable (zoom + visitas)
  const getRadius = (count) => {
    const base = Math.sqrt(count) * 3;

    // escala según zoom (más lejos = más grande)
    const zoomFactor = Math.pow(1.5, 8 - zoom);

    return Math.max(6, base * zoomFactor);
  };

  // 🎨 Colores por intensidad
  const getColor = (count) => {
    if (count > 650) return "#dc2626"; // rojo
    if (count > 450) return "#f97316";  // naranja
    if (count > 250) return "#eab308";  // amarillo
    if (count > 150) return "#22c55e";   // verde
    return "#3b82f6"; // azul
  };

  return (
    <div className="relative">

      <MapContainer
        center={[23.6345, -102.5528]} // México
        zoom={5}
        style={{ height: "500px", width: "100%" }}
      >
        <ZoomHandler />

        <TileLayer
          attribution="© OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 🔥 CLUSTER */}
        <MarkerClusterGroup>
          {data.map((item, i) => (
            <CircleMarker
              key={i}
              center={[item.lat, item.lng]}
              radius={getRadius(item.count)}
              pathOptions={{
                color: getColor(item.count),
                fillColor: getColor(item.count),
                fillOpacity: 0.7,
              }}
            >
              <Popup>
                <strong>CP:</strong> {item.zip} <br />
                <strong>Visitas:</strong> {item.count}
              </Popup>
            </CircleMarker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* 📊 LEYENDA */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded shadow text-sm">
        <p><span style={{ color: "#dc2626" }}>●</span> 650+ visitas</p>
        <p><span style={{ color: "#f97316" }}>●</span> 450+ visitas</p>
        <p><span style={{ color: "#eab308" }}>●</span> 250+ visitas</p>
        <p><span style={{ color: "#22c55e" }}>●</span> 150+ visitas</p>
        <p><span style={{ color: "#3b82f6" }}>●</span> 50+ visitas</p>
      </div>

    </div>
  );
}