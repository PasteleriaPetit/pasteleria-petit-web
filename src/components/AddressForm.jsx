import React, { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
} from "firebase/firestore";
import { useAuth } from "../auth/AuthProvider";
import {
  required,
  isValidPostalCodeMX,
  isValidPhoneMX,
} from "../utils/mx-address";

export default function AddressForm({ onSelected }) {
  const { user } = useAuth();

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [useNew, setUseNew] = useState(true);

  // Dirección seleccionada actualmente
  const [selectedAddress, setSelectedAddress] = useState(null);

  // Datos específicos de ESTA entrega
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryWindow, setDeliveryWindow] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    street: "",
    extNumber: "",
    intNumber: "",
    neighborhood: "",
    postalCode: "",
    city: "",
    state: "",
    country: "México",
    references: "",
  });

  const [errors, setErrors] = useState({});

  // =========================================================
  // UTILIDADES DE FECHA
  // =========================================================

  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const today = formatDateLocal(new Date());

  const getDaysAhead = (dateString) => {
    if (!dateString) return null;

    const selected = new Date(`${dateString}T00:00:00`);

    const now = new Date();
    const current = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const difference = selected.getTime() - current.getTime();

    return Math.round(difference / (1000 * 60 * 60 * 24));
  };

  const daysAhead = getDaysAhead(deliveryDate);

  // Lunes → miércoles = 2 días de diferencia
  // pero contando lunes como día 1, miércoles es el tercer día.
  const hasExtendedSchedule =
    daysAhead !== null && daysAhead >= 2;

  const normalSchedules = [
    {
      value: "10:00-14:00",
      label: "10:00 AM - 2:00 PM",
    },
    {
      value: "14:00-16:00",
      label: "2:00 PM - 4:00 PM",
    },
  ];

  const extendedSchedules = [
    {
      value: "08:00-10:00",
      label: "8:00 AM - 10:00 AM",
    },
    {
      value: "10:00-12:00",
      label: "10:00 AM - 12:00 PM",
    },
    {
      value: "12:00-14:00",
      label: "12:00 PM - 2:00 PM",
    },
    {
      value: "14:00-16:00",
      label: "2:00 PM - 4:00 PM",
    },
  ];

  const availableSchedules = hasExtendedSchedule
    ? extendedSchedules
    : normalSchedules;

  // =========================================================
  // CARGAR DIRECCIONES
  // =========================================================

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadAddresses = async () => {
      try {
        setLoading(true);

        const snap = await getDocs(
          collection(db, `users/${user.uid}/addresses`)
        );

        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setList(data);

        if (data.length > 0) {
          setUseNew(false);
          setSelectedAddress(data[0]);
        } else {
          setUseNew(true);
          setSelectedAddress(null);
        }
      } catch (error) {
        console.error("Error cargando direcciones:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAddresses();
  }, [user]);

  // =========================================================
  // SI CAMBIA FECHA, VERIFICAR QUE EL HORARIO SIGA EXISTIENDO
  // =========================================================

  useEffect(() => {
    if (!deliveryWindow) return;

    const stillExists = availableSchedules.some(
      (schedule) => schedule.value === deliveryWindow
    );

    if (!stillExists) {
      setDeliveryWindow("");
    }
  }, [deliveryDate]);

  // =========================================================
  // ENVIAR DIRECCIÓN + ENTREGA AL CHECKOUT
  // =========================================================

  useEffect(() => {
    // No consideramos la dirección completa hasta que también
    // exista fecha y horario.
    if (
      selectedAddress &&
      deliveryDate &&
      deliveryWindow
    ) {
      onSelected?.({
        ...selectedAddress,

        deliveryDate,
        deliveryWindow,

        // Las notas pertenecen al pedido, no a la dirección guardada
        notas: deliveryNotes.trim(),
      });
    } else {
      onSelected?.(null);
    }
  }, [
    selectedAddress,
    deliveryDate,
    deliveryWindow,
    deliveryNotes,
    onSelected,
  ]);

  // =========================================================
  // FORMULARIO
  // =========================================================

  const set = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const validate = () => {
    const e = {};

    if (!required(form.fullName)) {
      e.fullName = "Requerido";
    }

    if (!isValidPhoneMX(form.phone)) {
      e.phone = "Teléfono inválido";
    }

    if (!required(form.street)) {
      e.street = "Requerido";
    }

    if (!required(form.extNumber)) {
      e.extNumber = "Requerido";
    }

    if (!required(form.neighborhood)) {
      e.neighborhood = "Requerido";
    }

    if (!isValidPostalCodeMX(form.postalCode)) {
      e.postalCode = "CP inválido (5 dígitos)";
    }

    if (!required(form.city)) {
      e.city = "Requerido";
    }

    if (!required(form.state)) {
      e.state = "Requerido";
    }

    if (!required(form.country)) {
      e.country = "Requerido";
    }

    if (!deliveryDate) {
      e.deliveryDate = "Selecciona una fecha de entrega";
    }

    if (!deliveryWindow) {
      e.deliveryWindow = "Selecciona un horario de entrega";
    }

    setErrors(e);

    return Object.keys(e).length === 0;
  };

  // =========================================================
  // GUARDAR NUEVA DIRECCIÓN
  // =========================================================

  const save = async () => {
    if (!user) return;

    if (!validate()) return;

    setSaving(true);

    try {
      // Guardamos SOLAMENTE la dirección.
      // Fecha, horario y notas pertenecen al pedido.
      const ref = await addDoc(
        collection(db, `users/${user.uid}/addresses`),
        {
          ...form,
          createdAt: new Date(),
        }
      );

      const saved = {
        id: ref.id,
        ...form,
      };

      setList((prev) => [saved, ...prev]);

      setSelectedAddress(saved);
      setUseNew(false);
    } catch (error) {
      console.error("Error guardando dirección:", error);
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // SIN USUARIO
  // =========================================================

  if (!user) {
    return (
      <div className="p-4 border rounded-md text-wineDark/80">
        Inicia sesión para capturar tu dirección.
      </div>
    );
  }

  // =========================================================
  // COMPONENTE
  // =========================================================

  return (
    <div className="bg-white rounded-xl border border-rose/30 p-4 shadow-sm">
      <h3 className="text-wine text-lg font-semibold mb-4">
        Dirección de envío
      </h3>

      {/* =====================================================
          DIRECCIONES GUARDADAS
      ===================================================== */}

      {loading ? (
        <p className="text-sm text-wineDark/60 mb-4">
          Cargando direcciones...
        </p>
      ) : (
        list.length > 0 && (
          <div className="mb-5">
            <label className="text-sm text-wineDark/80 mb-1 block">
              Seleccionar una dirección guardada
            </label>

            <select
              className="w-full border rounded-md px-3 py-2"
              value={
                useNew
                  ? ""
                  : selectedAddress?.id || ""
              }
              onChange={(e) => {
                const id = e.target.value;

                if (!id) {
                  setUseNew(true);
                  setSelectedAddress(null);
                  return;
                }

                const found = list.find(
                  (address) => address.id === id
                );

                if (found) {
                  setUseNew(false);
                  setSelectedAddress(found);
                }
              }}
            >
              <option value="">
                — Nueva dirección —
              </option>

              {list.map((address) => (
                <option
                  key={address.id}
                  value={address.id}
                >
                  {address.fullName} ·{" "}
                  {address.street}{" "}
                  {address.extNumber},{" "}
                  {address.neighborhood}, CP{" "}
                  {address.postalCode}
                </option>
              ))}
            </select>
          </div>
        )
      )}

      {/* =====================================================
          NUEVA DIRECCIÓN
      ===================================================== */}

      {useNew && (
        <div className="mb-6">
          <div className="grid sm:grid-cols-2 gap-3">
            {/* Nombre */}
            <div>
              <label className="block text-sm mb-1">
                Nombre completo
              </label>

              <input
                type="text"
                className="w-full border rounded-md px-3 py-2"
                value={form.fullName}
                onChange={(e) =>
                  set("fullName", e.target.value)
                }
              />

              {errors.fullName && (
                <p className="text-red text-xs mt-1">
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm mb-1">
                Teléfono
              </label>

              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                className="w-full border rounded-md px-3 py-2"
                value={form.phone}
                onChange={(e) => {
                  const value =
                    e.target.value.replace(/\D/g, "");

                  set(
                    "phone",
                    value.slice(0, 10)
                  );
                }}
              />

              {errors.phone && (
                <p className="text-red text-xs mt-1">
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Calle */}
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">
                Calle
              </label>

              <input
                type="text"
                className="w-full border rounded-md px-3 py-2"
                value={form.street}
                onChange={(e) =>
                  set("street", e.target.value)
                }
              />

              {errors.street && (
                <p className="text-red text-xs mt-1">
                  {errors.street}
                </p>
              )}
            </div>

            {/* Exterior */}
            <div>
              <label className="block text-sm mb-1">
                Núm. exterior
              </label>

              <input
                type="text"
                className="w-full border rounded-md px-3 py-2"
                value={form.extNumber}
                onChange={(e) =>
                  set("extNumber", e.target.value)
                }
              />

              {errors.extNumber && (
                <p className="text-red text-xs mt-1">
                  {errors.extNumber}
                </p>
              )}
            </div>

            {/* Interior */}
            <div>
              <label className="block text-sm mb-1">
                Núm. interior (opcional)
              </label>

              <input
                type="text"
                className="w-full border rounded-md px-3 py-2"
                value={form.intNumber}
                onChange={(e) =>
                  set("intNumber", e.target.value)
                }
              />
            </div>

            {/* Colonia */}
            <div>
              <label className="block text-sm mb-1">
                Colonia
              </label>

              <input
                type="text"
                className="w-full border rounded-md px-3 py-2"
                value={form.neighborhood}
                onChange={(e) =>
                  set(
                    "neighborhood",
                    e.target.value
                  )
                }
              />

              {errors.neighborhood && (
                <p className="text-red text-xs mt-1">
                  {errors.neighborhood}
                </p>
              )}
            </div>

            {/* CP */}
            <div>
              <label className="block text-sm mb-1">
                Código Postal
              </label>

              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                className="w-full border rounded-md px-3 py-2"
                value={form.postalCode}
                onChange={(e) => {
                  const value =
                    e.target.value.replace(/\D/g, "");

                  set(
                    "postalCode",
                    value.slice(0, 5)
                  );
                }}
              />

              {errors.postalCode && (
                <p className="text-red text-xs mt-1">
                  {errors.postalCode}
                </p>
              )}
            </div>

            {/* Ciudad */}
            <div>
              <label className="block text-sm mb-1">
                Ciudad
              </label>

              <input
                type="text"
                className="w-full border rounded-md px-3 py-2"
                value={form.city}
                onChange={(e) =>
                  set("city", e.target.value)
                }
              />

              {errors.city && (
                <p className="text-red text-xs mt-1">
                  {errors.city}
                </p>
              )}
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm mb-1">
                Estado
              </label>

              <input
                type="text"
                className="w-full border rounded-md px-3 py-2"
                value={form.state}
                onChange={(e) =>
                  set("state", e.target.value)
                }
              />

              {errors.state && (
                <p className="text-red text-xs mt-1">
                  {errors.state}
                </p>
              )}
            </div>

            {/* País */}
            <div>
              <label className="block text-sm mb-1">
                País
              </label>

              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 bg-gray-50"
                value={form.country}
                readOnly
              />

              {errors.country && (
                <p className="text-red text-xs mt-1">
                  {errors.country}
                </p>
              )}
            </div>

            {/* Referencias */}
            <div>
              <label className="block text-sm mb-1">
                Referencias del domicilio
                (opcional)
              </label>

              <input
                type="text"
                placeholder="Ej. Casa blanca, portón negro..."
                className="w-full border rounded-md px-3 py-2"
                value={form.references}
                onChange={(e) =>
                  set(
                    "references",
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="
                bg-wine text-cream
                px-4 py-2
                rounded-lg
                hover:opacity-90
                disabled:opacity-60
              "
            >
              {saving
                ? "Guardando..."
                : "Guardar y usar"}
            </button>

            {list.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setUseNew(false);

                  if (list[0]) {
                    setSelectedAddress(
                      list[0]
                    );
                  }
                }}
                className="
                  border border-wine
                  text-wine
                  px-4 py-2
                  rounded-lg
                  hover:bg-rose/20
                "
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          INFORMACIÓN DE ENTREGA
      ===================================================== */}

      <div className="border-t border-rose/30 pt-5 mt-5">
        <h4 className="text-wine font-semibold text-lg mb-1">
          Fecha y horario de entrega
        </h4>

        <p className="text-sm text-wineDark/70 mb-4">
          Selecciona el día y el horario en el
          que deseas recibir tu pedido.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {/* FECHA */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Fecha de entrega
            </label>

            <input
              type="date"
              min={today}
              value={deliveryDate}
              onChange={(e) => {
                setDeliveryDate(
                  e.target.value
                );

                setErrors((prev) => ({
                  ...prev,
                  deliveryDate: "",
                }));
              }}
              className="
                w-full
                border
                rounded-md
                px-3
                py-2
                bg-white
              "
            />

            {errors.deliveryDate && (
              <p className="text-red text-xs mt-1">
                {errors.deliveryDate}
              </p>
            )}
          </div>

          {/* HORARIO */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Horario de entrega
            </label>

            <select
              value={deliveryWindow}
              disabled={!deliveryDate}
              onChange={(e) => {
                setDeliveryWindow(
                  e.target.value
                );

                setErrors((prev) => ({
                  ...prev,
                  deliveryWindow: "",
                }));
              }}
              className="
                w-full
                border
                rounded-md
                px-3
                py-2
                bg-white
                disabled:bg-gray-100
                disabled:cursor-not-allowed
              "
            >
              <option value="">
                Selecciona un horario
              </option>

              {availableSchedules.map(
                (schedule) => (
                  <option
                    key={schedule.value}
                    value={schedule.value}
                  >
                    {schedule.label}
                  </option>
                )
              )}
            </select>

            {errors.deliveryWindow && (
              <p className="text-red text-xs mt-1">
                {errors.deliveryWindow}
              </p>
            )}
          </div>
        </div>

        {/* INFORMACIÓN DE HORARIOS */}
        {deliveryDate && (
          <div className="mt-4 bg-rose/10 border border-rose/30 rounded-xl p-4">
            {hasExtendedSchedule ? (
              <>
                <p className="text-wine font-semibold text-sm">
                  Horarios disponibles
                </p>

                <p className="text-wineDark/70 text-sm mt-1">
                  Debido a que tu pedido se
                  realizará con anticipación,
                  puedes seleccionar intervalos
                  de entrega de 2 horas.
                </p>
              </>
            ) : (
              <>
                <p className="text-wine font-semibold text-sm">
                  Horarios disponibles
                </p>

                <p className="text-wineDark/70 text-sm mt-1">
                  Para esta fecha contamos con
                  dos ventanas de entrega:
                  de 10:00 AM a 2:00 PM y de
                  2:00 PM a 4:00 PM.
                </p>
              </>
            )}
          </div>
        )}

        {/* =====================================================
            NOTAS
        ===================================================== */}

        <div className="mt-5">
          <label className="block text-sm font-medium mb-1">
            Notas adicionales para la entrega
            (opcional)
          </label>

          <textarea
            rows={5}
            maxLength={1000}
            value={deliveryNotes}
            onChange={(e) =>
              setDeliveryNotes(
                e.target.value
              )
            }
            placeholder="Escribe cualquier indicación adicional para la entrega. Por ejemplo: tocar el timbre, entregar en recepción, comunicarse al llegar, referencias adicionales, etc."
            className="
              w-full
              border
              rounded-md
              px-3
              py-2
              resize-y
              min-h-[130px]
            "
          />

          <div className="flex justify-between gap-3 mt-1">
            <p className="text-xs text-wineDark/60">
              Puedes agregar instrucciones
              adicionales para el repartidor.
            </p>

            <p className="text-xs text-wineDark/50 whitespace-nowrap">
              {deliveryNotes.length}/1000
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}