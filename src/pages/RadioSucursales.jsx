import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
import L, { LatLngBounds } from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { Fragment ,useMemo } from "react";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";

const defaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;


export default function RadioSucursales() {
  const sucursales = [
    { nombre:"San Juan Bosco", direccion:"C. Juan de Dios Robledo 403, Las Huertas, 44739 Guadalajara, Jal", lat:20.674618838193982, lng:-103.31321887139599, color:"#ef4444" },
    { nombre:"Circunvalación", direccion:"Av. Cvln. División del Nte. 67, Independencia, 44379 Guadalajara, Jal.", lat:20.697724681055437, lng:-103.3316775042961, color:"#3b82f6" },
    { nombre:"El Salto", direccion:"Libramiento Juanacatlán #40-C, El Salto, Jalisco 45680", lat:20.517697417379612, lng:-103.18275665687331, color:"#22c55e" },
    { nombre:"Obsidiana", direccion:"Obsidiana #3805 A Esq. Av Conchita, Loma Bonita, Zapopan, Jal. 45086", lat:20.637502868919736, lng:-103.404122888952, color:"#eab308" },
    { nombre:"Minerva", direccion:"Av. Ignacio L. Vallarta #2420-B, Guadalajara, Jal. 44690", lat:20.674786734675628, lng:-103.38907580464102, color:"#f97316" },
    { nombre:"Tlaquepaque", direccion:"Calle Francisco I. Madero #163, Tlaquepaque, Jal. 45500", lat:20.64227236417303, lng:-103.31161051904314, color:"#8b5cf6" },
    { nombre:"Río Nilo", direccion:"Av. Río Nilo #2916, Jardines de la Paz, Jal.", lat:20.64529477936951, lng:-103.29962050429745, color:"#ec4899" },
    { nombre:"Revolución", direccion:"Calz. Revolución #1856, Universitaria, Guadalajara 44840", lat:20.655484046878023, lng:-103.31773690429716, color:"#14b8a6" },
    { nombre:"Plan de San Luis", direccion:"Av. Plan de San Luis No. 1591-A, Mezquitán Country 44260", lat:20.697026400153632, lng:-103.36031091778688, color:"#84cc16" },
    { nombre:"Zapopan", direccion:"Francisco Javier Mina No. 204, Zapopan Centro, Jal. 45100", lat:20.719914120274673, lng:-103.3896270425512, color:"#6366f1" },
    { nombre:"Patria", direccion:"Av. Patria No. 4926, Jardines Universidad, Zapopan, Jal. 45110", lat:20.687932395574467, lng:-103.41972811964199, color:"#f43f5e" },
  ];

  const validas = sucursales.filter(s=>s.lat!=null && s.lng!=null);

  const { t } = useTranslation();

  const bounds = useMemo(()=>{
    if(!validas.length) return null;
    return new LatLngBounds(validas.map(s=>[s.lat,s.lng]));
  },[validas]);

  return (
    <main className="bg-cream min-h-screen pt-24 pb-16">
      <section className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-wine">{t("cobertura.radioSucursales.title")}</h1>
          <p className="mt-4 text-gray-600 max-w-3xl mx-auto">
            {t("cobertura.radioSucursales.subtitle")}
          </p>
          <p className="mt-4 text-gray-600 max-w-3xl mx-auto">
            {t("cobertura.radioSucursales.explicacion1")}
          </p>
          <p className="mt-4 text-gray-600 max-w-3xl mx-auto">
            {t("cobertura.radioSucursales.horarioentrega")}
          </p>
          
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 rounded-2xl overflow-hidden shadow-xl border border-gray-200">
            <MapContainer
              bounds={bounds || undefined}
              center={[20.6597,-103.3496]}
              zoom={11}
              scrollWheelZoom={true}
              style={{height:"650px",width:"100%"}}
            >
              <TileLayer
                attribution="© OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {validas.map((s) => (
                <Fragment key={s.nombre}>
                  <Marker position={[s.lat,s.lng]}>
                    <Popup>
                      <strong>{s.nombre}</strong><br/>
                      {s.direccion}<br/><br/>
                      
                      {t("cobertura.radioSucursales.radio")}
                    </Popup>
                  </Marker>
                  <Circle
                    center={[s.lat,s.lng]}
                    radius={9000}
                    pathOptions={{
                      color:s.color,
                      fillColor:s.color,
                      fillOpacity:0.25,
                      weight:2
                    }}
                  />
               </Fragment> 
              ))}
              
            </MapContainer>
          </div>

          <aside className="bg-white rounded-2xl shadow-xl p-6 h-fit">
            <h2 className="text-2xl font-bold text-wine mb-4">{t("cobertura.radioSucursales.sucursales")}</h2>
            

            <div className="space-y-3">
              {sucursales.map((s)=>(
                <div key={s.nombre} className="flex items-center gap-3">
                  <span style={{
                    background:s.color,
                    width:16,
                    height:16,
                    borderRadius:"50%",
                    display:"inline-block"
                  }}/>
                  <span>{s.nombre}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl bg-cream p-4 border">
              <h3 className="font-semibold text-wine mb-2">{t("cobertura.radioSucursales.informacion")}</h3>
              <p className="text-sm text-gray-600">
                {t("cobertura.radioSucursales.cobertura")}
              </p>
            </div>
          </aside>
        </div>
      </section>
      {/* /* {/* WhatsApp - Servicio a domicilio */}
      {/* <a
        href="https://wa.me/523334416133?text=Hola%20Petit%20Reposter%C3%ADa%20con%20Alma%2C%20quiero%20consultar%20sobre%20la%20cobertura%20de%20entrega."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 right-5 z-[999] flex items-center justify-center bg-[#25D366] text-white w-16 h-16 rounded-full shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300"
        aria-label="Contactar por WhatsApp"
      >
        <FontAwesomeIcon icon={faWhatsapp} className="text-4xl" />
      </a> */}
    </main>
  );
}
